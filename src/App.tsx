import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AppSidebar } from "./components/AppSidebar";
import { CreateTestUser } from "./components/CreateTestUser";
import Admin from "./pages/Admin";
import Analytics from "./pages/Analytics";
import Calculator from "./pages/Calculator";
import Dashboard from "./pages/Dashboard";
import Details from "./pages/Details";
import Groups from "./pages/Groups";
import Integrations from "./pages/Integrations";
import Leads from "./pages/Leads";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import ResearchInsights from "./pages/ResearchInsights";
import SalesByGroup from "./pages/SalesByGroup";
import TrafficAnalysis from "./pages/TrafficAnalysis";
import AccountDisabled from "./pages/auth/AccountDisabled";
import PendingApproval from "./pages/auth/PendingApproval";
import ResetPassword from "./pages/auth/ResetPassword";
import SeedTestUser from "./pages/auth/SeedTestUser";
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";

const queryClient = new QueryClient();

function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname.startsWith('/auth') || location.pathname === '/';
  
  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/" element={<SignIn />} />
        <Route path="/auth/signin" element={<SignIn />} />
        <Route path="/auth/signup" element={<SignUp />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/auth/pending-approval" element={<PendingApproval />} />
        <Route path="/auth/account-disabled" element={<AccountDisabled />} />
        <Route path="/auth/seed-test-user" element={<SeedTestUser />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 bg-background">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/details" element={<Details />} />
            <Route path="/traffic-analysis" element={<TrafficAnalysis />} />
            <Route path="/research-insights" element={<ResearchInsights />} />
            <Route path="/sales-by-group" element={<SalesByGroup />} />
            <Route path="/calculator" element={<Calculator />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/create-test-user" element={<CreateTestUser />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </SidebarProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
