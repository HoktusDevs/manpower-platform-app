import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { PostulanteHeader } from './PostulanteHeader';
import { PostulanteSidebar } from './PostulanteSidebar';

interface PostulanteLayoutProps {
  children: ReactNode;
}

export const PostulanteLayout = ({ children }: PostulanteLayoutProps) => {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <div className="h-screen bg-gray-100 overflow-hidden">
      <PostulanteHeader />

      <div className="flex h-[calc(100vh-4rem)] overflow-visible">
        <PostulanteSidebar onNavigate={handleNavigate} />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};