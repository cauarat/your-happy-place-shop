import { EditorProvider } from './EditorContext';
import { TopBar } from './TopBar';
import { ComponentDrawer } from './ComponentDrawer';
import { Canvas } from './Canvas';
import { FloatingToolbar } from './FloatingToolbar';
import { RightPanel } from './RightPanel';

export default function DesignEditor() {
  return (
    <EditorProvider>
      <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] bg-gray-50 overflow-hidden text-black font-sans">
        <TopBar />
        <div className="flex flex-1 overflow-hidden relative">
          <ComponentDrawer />
          <Canvas />
          <RightPanel />
          <FloatingToolbar />
        </div>
      </div>
    </EditorProvider>
  );
}
