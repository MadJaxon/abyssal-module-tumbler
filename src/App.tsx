import { AppShell } from './components/AppShell';
import { InventoryPane } from './components/inventory/InventoryPane';
import { FitBar } from './components/fit/FitBar';
import { ResultsPane } from './components/results/ResultsPane';

export default function App() {
  return (
    <AppShell>
      <InventoryPane />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <FitBar />
        <ResultsPane />
      </div>
    </AppShell>
  );
}
