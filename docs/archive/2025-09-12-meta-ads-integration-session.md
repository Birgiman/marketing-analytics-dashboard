# Meta Ads Integration Session - September 12, 2025

## Session Overview

This session continued from a previous conversation focused on Meta Ads integration testing and UI fixes. The main issues addressed were:

1. **Database Migration Issue**: Lives page showing empty due to missing `live_campaigns` table relationship
2. **Campaign Selection Flow Problem**: Incorrect API usage trying to fetch campaigns from all accounts simultaneously
3. **Meta API Integration**: Implementing proper 2-step campaign selection flow

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

## Final State

After this session:
- ✅ Database schema fully synchronized with live_campaigns table
- ✅ Campaign selection flow redesigned to 2-step process
- ✅ API filtering working correctly with Meta Marketing API
- ✅ Full CRUD operations for Live-Campaign relationships
- ✅ Search functionality with both local and API-level filtering
- ✅ Error handling and loading states implemented
- ✅ User authentication integrated throughout

## Files Modified

1. **src/components/CampaignSelector.tsx** - Complete rewrite
2. **src/hooks/useLives.tsx** - Added campaign relationship handling
3. **src/components/CreateLiveModal.tsx** - Updated for campaign flow
4. **src/utils/metaApi.ts** - Fixed filtering bug
5. **supabase/migrations/20250912120000_create_live_campaigns_table.sql** - New migration

## Session Conclusion

The Meta Ads integration is now fully functional with:
- Proper database relationships
- Intuitive user interface with 2-step selection
- Robust API error handling
- Search capabilities
- Complete CRUD operations for campaign management

The system now correctly handles the workflow of creating Lives, selecting WhatsApp groups, and associating Meta advertising campaigns for comprehensive live event management.