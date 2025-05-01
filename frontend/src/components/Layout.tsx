import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white">
      <header className="bg-white dark:bg-gray-800 shadow-md p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            멀티시그 지갑
          </h1>
        </div>
      </header>

      <main className="container mx-auto p-4 mt-4">{children}</main>

      <footer className="bg-white dark:bg-gray-800 shadow-md p-4 mt-8">
        <div className="container mx-auto text-center text-gray-500 dark:text-gray-400">
          <p>© 2024 멀티시그 지갑 - 테스트용</p>
        </div>
      </footer>
    </div>
  );
}
