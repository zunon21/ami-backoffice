import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Partenaires from './pages/Partenaires';
import DiversEngagements from './pages/DiversEngagements';
import HistoriqueEngagements from './pages/HistoriqueEngagements';
import Dons from './pages/Dons';
import Archives from './pages/Archives';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Partenaires />} />
          <Route path="partenaires" element={<Partenaires />} />
          <Route path="divers-engagements" element={<DiversEngagements />} />
          <Route path="historique-engagements" element={<HistoriqueEngagements />} />
          <Route path="dons" element={<Dons />} />
          <Route path="archives" element={<Archives />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;