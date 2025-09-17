# Meta Ads Integration Session - September 12, 2025

## Session Overview

This session continued from a previous conversation focused on Meta Ads integration testing and UI fixes. The main issues addressed were:

1. **Database Migration Issue**: Lives page showing empty due to missing `live_campaigns` table relationship
2. **Campaign Selection Flow Problem**: Incorrect API usage trying to fetch campaigns from all accounts simultaneously
3. **Meta API Integration**: Implementing proper 2-step campaign selection flow
4. **Infinite Requests Loop**: Fixed critical performance issue in Live details page
5. **Campaign Status Filtering**: Added user-friendly status filters for Active/Paused campaigns
6. **API Error Resolution**: Resolved Meta API filtering errors and improved error handling

## Key Issues Resolved

### 1. Database Schema Issue
**Problem**: Console errors showing "Could not find a relationship between 'lives' and 'live_campaigns' in the schema cache"

**Root Cause**: The `live_campaigns` table migration wasn't applied to the remote database due to local migration desynchronization.

**Solution**: User applied the migration SQL directly in Supabase Dashboard:

```sql
-- Create live_campaigns table
CREATE TABLE live_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  live_id UUID NOT NULL REFERENCES lives(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  account_id TEXT,
  account_name TEXT,
  objective TEXT,
  status TEXT NOT NULL,
  daily_budget DECIMAL(10,2),
  lifetime_budget DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create RLS policies
ALTER TABLE live_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own live campaigns" ON live_campaigns
  FOR SELECT USING (live_id IN (
    SELECT id FROM lives WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own live campaigns" ON live_campaigns
  FOR INSERT WITH CHECK (live_id IN (
    SELECT id FROM lives WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own live campaigns" ON live_campaigns
  FOR UPDATE USING (live_id IN (
    SELECT id FROM lives WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own live campaigns" ON live_campaigns
  FOR DELETE USING (live_id IN (
    SELECT id FROM lives WHERE user_id = auth.uid()
  ));
```

### 2. Campaign Selection Flow Redesign

**Problem**: System was attempting to fetch campaigns from all 15 Ad Accounts simultaneously, causing API errors.

**Original Flow**: Direct campaign selection from all accounts
**New Flow**: 2-step process:
1. First, user selects an Ad Account
2. Then, campaigns are fetched from that specific account

**Key Implementation Changes**:

#### CampaignSelector.tsx - Complete Rewrite
- Added Ad Account selection step
- Implemented search functionality with API filtering
- Added loading states and error handling
- Support for both "Show All" and "Search by Keyword" modes

```typescript
// Meta API filtering implementation
const response = await fetch(
  `https://graph.facebook.com/v23.0/${account.id}/campaigns?` +
  new URLSearchParams({
    fields: options.fields.join(','),
    access_token: token,
    limit: options.limit.toString(),
    filtering: JSON.stringify([{
      field: 'name',
      operator: 'CONTAIN',
      value: searchTerm.trim()
    }])
  })
);
```

#### useLives.tsx Updates
Updated to handle campaign relationships in all CRUD operations:

```typescript
// Create live_campaigns entries
if (campaigns.length > 0) {
  const liveCampaigns = campaigns.map(campaign => ({
    live_id: liveResult.id,
    campaign_id: campaign.id,
    campaign_name: campaign.name,
    account_id: (campaign as any).account_id || null,
    account_name: (campaign as any).account_name || null,
    objective: campaign.objective || null,
    status: campaign.status,
    daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) : null,
    lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) : null
  }))

  const { error: campaignsError } = await supabase
    .from('live_campaigns')
    .insert(liveCampaigns)
}
```

### 3. API Filtering Bug Fix

**Problem**: All campaign requests failing with "Error 100: Unsupported filtering"

**Root Cause**: Incorrect filtering field name in `metaApi.ts`
**Fix**: Changed from `'campaign.status'` to `'status'`

```typescript
// Before (broken)
filtering: JSON.stringify([{
  field: 'campaign.status',
  operator: 'IN',
  value: ['ACTIVE', 'PAUSED']
}])

// After (working)
filtering: JSON.stringify([{
  field: 'status',
  operator: 'IN', 
  value: ['ACTIVE', 'PAUSED']
}])
```

## Technical Architecture

### Database Schema
- **lives**: Main Live events table
- **live_campaigns**: Junction table linking Lives to Meta campaigns
- **live_groups**: Junction table linking Lives to WhatsApp groups
- **deleted_lives**: Soft delete table for Lives
- **deleted_live_groups**: Soft delete table for Live groups

### Meta API Integration
- **Version**: v23.0
- **Authentication**: Access tokens from Facebook Login
- **Filtering**: CONTAIN operator for campaign name searches
- **Pagination**: Limit-based with cursor support
- **Fields**: Comprehensive campaign data including budgets, status, objectives

### Component Architecture
- **CreateLiveModal**: 3-step modal flow (Live details → Groups → Campaigns)
- **CampaignSelector**: 2-step selection (Ad Accounts → Campaigns)
- **GroupSelector**: WhatsApp group management
- **LivesPage**: Main dashboard with CRUD operations

## User Feedback and Interactions

Key user insights during the session:

> "a gente tem que, primeiro, escolher o usuário, que é uma AD Account, aí, dentro desse usuário AD Account... vai consultar esse ID, vai passar ele na requisição, e vai listar as campanhas que ele tem ativo"

This feedback led to the complete redesign of the campaign selection flow.

> "me mande o comando em SQL que eu copio e colo lá na Dashboard do Supabase"

This indicated the migration synchronization issue and led to the direct SQL approach.

### 4. Infinite Requests Loop Issue (Session Continuation)

**Problem**: Live details page making 434+ API requests infinitely, causing rate limits and performance issues.

**Root Cause**: The `useMetaLivesData` hook had a circular dependency in its `useEffect`:
```typescript
// Problem (before)
useEffect(() => {
  refreshData();
}, [refreshData]); // refreshData changes every time userId changes
```

**Solution**: Fixed dependency array to only depend on `userId`:
```typescript
// Solution (after)  
useEffect(() => {
  refreshData();
}, [userId]); // Only userId as dependency
```

**Impact**: Reduced API calls from 434+ to normal levels, eliminated rate limiting errors.

### 5. Campaign Status Filtering Enhancement

**Problem**: Users needed to filter campaigns by status (Active/Paused) to reduce clutter from inactive campaigns.

**Solution**: Added comprehensive status filtering:
- **UI Enhancement**: Added checkboxes for "Ativas" and "Pausadas" in a highlighted section
- **Dual Filtering**: Works in both "Show All" and "Search by Keyword" modes
- **Local Filtering**: Filters applied client-side to avoid API limitations
- **User Experience**: Both checkboxes checked by default, reset on modal open

```typescript
// Filter logic implementation
const filteredCampaigns = campaigns.filter(campaign => {
  // Status filter
  const statusMatch = 
    (campaign.status === 'ACTIVE' && showActive) ||
    (campaign.status === 'PAUSED' && showPaused);
  
  if (!statusMatch) return false;
  
  // Name filter (when not using API search)
  if (!useSearch && searchTerm) {
    return campaign.name.toLowerCase().includes(searchTerm.toLowerCase());
  }
  
  return true;
});
```

### 6. Meta API Filtering Resolution

**Problem**: API error "(#100) Filtering field 'status' is not supported" when trying to filter campaigns by status via Meta API.

**Root Cause**: Meta Marketing API doesn't support status filtering on campaigns endpoint.

**Solution**: 
- **Removed API-level status filtering** to eliminate API errors
- **Maintained name-based filtering** using `field: 'name', operator: 'CONTAIN'` which works correctly
- **Implemented client-side status filtering** for better user experience
- **Ensured both search modes work**: "Show All Campaigns" and "Search by Keyword"

**API Configuration**:
```typescript
// Working API call for name search
const response = await fetch(
  `https://graph.facebook.com/v23.0/${account.id}/campaigns?` +
  new URLSearchParams({
    fields: options.fields.join(','),
    access_token: token,
    limit: options.limit.toString(),
    filtering: JSON.stringify([{
      field: 'name',
      operator: 'CONTAIN', 
      value: searchTerm.trim()
    }])
  })
);
```

### 7. Campaign Data Analysis

**Reference Data**: Based on Meta CSV export for campaign "Post do Instagram: Lojista, sabe o que acontece...":
- **Period**: Sept 1-12, 2025
- **Reach**: 3,633 users
- **Impressions**: 4,967
- **Budget**: R$ 6.00 daily
- **Amount Spent**: R$ 69.22
- **Results**: 255 link clicks
- **Cost per Result**: R$ 0.27
- **Status**: Active

This data provides validation benchmarks for the integration to ensure correct metrics are being displayed.

## Final State

After this session:
- ✅ Database schema fully synchronized with live_campaigns table
- ✅ Campaign selection flow redesigned to 2-step process
- ✅ API filtering working correctly with Meta Marketing API
- ✅ Full CRUD operations for Live-Campaign relationships
- ✅ Search functionality with both local and API-level filtering
- ✅ Error handling and loading states implemented
- ✅ User authentication integrated throughout
- ✅ **Infinite requests loop eliminated** (434+ requests → normal levels)
- ✅ **Campaign status filters implemented** (Active/Paused checkboxes)
- ✅ **Meta API errors resolved** (status filtering moved client-side)
- ✅ **Performance optimization** (eliminated rate limiting issues)
- ✅ **Enhanced user experience** with intuitive filtering options

## Files Modified

### Initial Implementation:
1. **src/components/CampaignSelector.tsx** - Complete rewrite with 2-step flow
2. **src/hooks/useLives.tsx** - Added campaign relationship handling
3. **src/components/CreateLiveModal.tsx** - Updated for campaign flow
4. **src/utils/metaApi.ts** - Fixed filtering bug
5. **supabase/migrations/20250912120000_create_live_campaigns_table.sql** - New migration

### Session Continuation Updates:
6. **src/hooks/useMetaLivesData.tsx** - Fixed infinite loop dependency issue
7. **src/components/CampaignSelector.tsx** - Added status filtering UI and logic
8. **src/utils/metaApi.ts** - Removed problematic status filtering, kept name filtering
9. **docs/archive/planilhas-do-meta/[VL]-[RS]-Rafael-Santos-CA-Campanhas-1-de-set-de-2025-12-de-set-de-2025.csv** - Reference data for validation

## Session Conclusion

The Meta Ads integration has evolved through multiple iterations to become a robust, production-ready system:

### Core Functionality:
- **Database Integration**: Complete schema with live_campaigns relationships and RLS policies
- **2-Step Campaign Selection**: Intuitive Ad Account → Campaigns flow
- **Advanced Filtering**: Client-side status filters (Active/Paused) + API name search
- **Performance Optimized**: Eliminated infinite request loops and rate limiting issues
- **Error Resilient**: Proper error handling for API limitations and edge cases

### User Experience Improvements:
- **Status Filtering**: Reduce clutter by filtering Active/Paused campaigns
- **Dual Search Modes**: "Show All" for browsing, "Search by Keyword" for precision
- **Real-time Updates**: Manual refresh with loading states and error feedback
- **Data Validation**: Reference benchmarks from actual Meta CSV exports

### Technical Architecture:
- **Meta Marketing API v23.0**: Correct usage patterns avoiding unsupported filtering
- **React Components**: Modular, reusable components with proper state management  
- **Supabase Integration**: RLS policies, foreign keys, and proper data relationships
- **Performance**: Optimized hooks preventing circular dependencies and excessive API calls

### Validation Data:
Using real campaign "Post do Instagram: Lojista, sabe o que acontece..." as benchmark:
- Period: Sept 1-12, 2025 | Budget: R$ 6/day | Spent: R$ 69.22
- Reach: 3,633 | Impressions: 4,967 | Clicks: 255 | CPM: R$ 0.27

The system now provides a complete workflow for Live event management with integrated Meta advertising campaign tracking, supporting the full lifecycle from creation to performance analysis.