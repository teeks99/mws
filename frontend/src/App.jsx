import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  const [locations, setLocations] = useState([]);
  const [activeLocation, setActiveLocation] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Initialize from localStorage or fallback to defaults
  const [unitSystem, setUnitSystem] = useState(() => localStorage.getItem('unitSystem') || 'us');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  // Persist settings whenever they change
  useEffect(() => {
    localStorage.setItem('unitSystem', unitSystem);
  }, [unitSystem]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'light') {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
    }
  }, [theme]);

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/locations/');
      const data = await res.json();
      setLocations(data);
      
      const pathName = decodeURIComponent(window.location.pathname.substring(1)).toLowerCase();
      const match = pathName ? data.find(loc => loc.name.toLowerCase() === pathName) : null;
      
      if (match) {
        setActiveLocation(match);
      } else if (data.length > 0 && !activeLocation) {
        setActiveLocation(data[0]);
        window.history.replaceState(null, '', `/${encodeURIComponent(data[0].name.toLowerCase())}`);
      }
    } catch (err) {
      console.error("Failed to fetch locations", err);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const pathName = decodeURIComponent(window.location.pathname.substring(1)).toLowerCase();
      if (pathName && locations.length > 0) {
        const match = locations.find(loc => loc.name.toLowerCase() === pathName);
        if (match) setActiveLocation(match);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [locations]);

  const handleAddLocation = async (loc) => {
    try {
      const res = await fetch('/api/locations/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify(loc)
      });
      if (res.ok) {
        await fetchLocations();
      } else {
        const error = await res.json();
        alert(error.detail || "Failed to add location");
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    }
  };

  const handleDeleteLocation = async (name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      const res = await fetch(`/api/locations/${name}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': apiKey
        }
      });
      if (res.ok) {
        if (activeLocation?.name === name) {
          setActiveLocation(null);
          window.history.pushState(null, '', '/');
        }
        await fetchLocations();
      } else {
        const error = await res.json();
        alert(error.detail || "Failed to delete location");
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    }
  };

  return (
    <div className="app-container">
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} 
        onClick={() => setIsSidebarOpen(false)} 
      />
      <Sidebar 
        locations={locations}
        activeLocation={activeLocation}
        onSelectLocation={(loc) => {
          setActiveLocation(loc);
          window.history.pushState(null, '', `/${encodeURIComponent(loc.name.toLowerCase())}`);
          setIsSidebarOpen(false); // Close on selection
        }}
        onAddLocation={handleAddLocation}
        onDeleteLocation={handleDeleteLocation}
        apiKey={apiKey}
        setApiKey={setApiKey}
        isOpen={isSidebarOpen}
        unitSystem={unitSystem}
        setUnitSystem={setUnitSystem}
        theme={theme}
        setTheme={setTheme}
      />
      <Dashboard 
        location={activeLocation} 
        onToggleSidebar={() => setIsSidebarOpen(true)}
        unitSystem={unitSystem}
        theme={theme}
      />
    </div>
  );
}

export default App;
