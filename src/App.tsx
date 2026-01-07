import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import SidebarLayout from './components/Layout/SidebarLayout';
import LoadingScreen from './components/UI/LoadingScreen';

// Lazy Load Pages
const Home = lazy(() => import('./features/Home/Home'));
const Reader = lazy(() => import('./features/Reader/Reader'));
const Library = lazy(() => import('./features/Library/Library'));
const History = lazy(() => import('./features/History/History'));
const Favorites = lazy(() => import('./features/Favorites/Favorites'));

export default function App() {
  return (
    <AppProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              {/* Global Layout including Sidebar */}
              <Route element={<SidebarLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/library" element={<Library />} />
                <Route path="/history" element={<History />} />
                <Route path="/favorites" element={<Favorites />} />
              </Route>

              {/* Standalone Reader Route (No Sidebar) */}
              <Route path="book/:bookId" element={<Reader />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ErrorBoundary>
    </AppProvider>
  );
}
