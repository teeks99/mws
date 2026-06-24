import React, { useState } from 'react';
import { MapPin, Plus, Trash2, Key } from 'lucide-react';

export default function Sidebar({ 
  locations, 
  activeLocation, 
  onSelectLocation, 
  onAddLocation, 
  onDeleteLocation,
  apiKey,
  setApiKey,
  isOpen,
  unitSystem,
  setUnitSystem,
  theme,
  setTheme
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLat, setNewLat] = useState('');
  const [newLon, setNewLon] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    if (newName && newLat && newLon) {
      onAddLocation({
        name: newName.toLowerCase(),
        lat: parseFloat(newLat),
        lon: parseFloat(newLon)
      });
      setIsAdding(false);
      setNewName('');
      setNewLat('');
      setNewLon('');
    }
  };

  return (
    <div className={`glass-panel sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <h1>Personal Weather</h1>
      </div>

      <div className="location-list">
        {locations.map(loc => (
          <div 
            key={loc.name}
            className={`location-item ${activeLocation?.name === loc.name ? 'active' : ''}`}
            onClick={() => onSelectLocation(loc)}
          >
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <MapPin size={18} color={activeLocation?.name === loc.name ? '#3b82f6' : '#94a3b8'} />
              <span className="location-item-name" style={{textTransform: 'capitalize'}}>{loc.name}</span>
            </div>
            {apiKey && (
              <button 
                className="btn-danger" 
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteLocation(loc.name);
                }}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div style={{marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <label style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Units</label>
          <select 
            value={unitSystem} 
            onChange={e => setUnitSystem(e.target.value)}
            style={{background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--panel-border)', borderRadius: '4px', padding: '4px', outline: 'none'}}
          >
            <option value="us">US / Imperial</option>
            <option value="metric">Metric</option>
          </select>
        </div>
        <div style={{marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <label style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Theme</label>
          <select 
            value={theme} 
            onChange={e => setTheme(e.target.value)}
            style={{background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--panel-border)', borderRadius: '4px', padding: '4px', outline: 'none'}}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
        
        {isAdding ? (
          <form className="add-location-form glass-panel" style={{padding: '16px', border: 'none', background: 'rgba(0,0,0,0.2)'}} onSubmit={handleAdd}>
            <div className="input-group">
              <label>Location Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. home" required />
            </div>
            <div className="input-group">
              <label>Latitude</label>
              <input type="number" step="any" value={newLat} onChange={e => setNewLat(e.target.value)} placeholder="47.60" required />
            </div>
            <div className="input-group">
              <label>Longitude</label>
              <input type="number" step="any" value={newLon} onChange={e => setNewLon(e.target.value)} placeholder="-122.33" required />
            </div>
            <div style={{display: 'flex', gap: '8px', marginTop: '8px'}}>
              <button type="submit" className="btn-primary" style={{flex: 1}}>Add</button>
              <button type="button" onClick={() => setIsAdding(false)} style={{padding: '8px', background: 'transparent', color: '#94a3b8'}}>Cancel</button>
            </div>
          </form>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            <button className="btn-primary" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%'}} onClick={() => setIsAdding(true)}>
              <Plus size={18} /> Add Location
            </button>
            <div className="input-group">
              <label style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Key size={12}/> API Key (for changes)</label>
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Enter key..." />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
