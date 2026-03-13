import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ChartProvider } from './context/ChartContext';
import { ClientProviders } from './components/providers/client-providers';
import Home from './app/page'; // とりあえず既存のファイルを読み込む (後で調整)
import LoginPage from './app/login/page';
import SignupPage from './app/signup/page';
import SettingsPage from './app/settings/page';
import PricingPage from './app/pricing/page';
import SuccessPage from './app/success/page';
import HelpPage from './app/help/page';
import TermsPage from './app/terms/page';
import PrivacyPage from './app/privacy/page';
import LegalPage from './app/legal/page';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ChartProvider>
          <div className="dark min-h-screen bg-background text-foreground font-body">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/success" element={<SuccessPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/legal" element={<LegalPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          <ClientProviders />
        </ChartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
