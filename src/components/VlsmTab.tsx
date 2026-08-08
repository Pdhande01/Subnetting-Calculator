import React, { useState, useMemo } from 'react';
import { 
  calculateVLSM, 
  validateIp
} from '../utils/ipUtils';
import {
  Plus, 
  Trash2, 
  Play, 
  RefreshCw, 
  Download, 
  Printer, 
  Info,
  Layers,
  Sparkles,
  Network
} from 'lucide-react';

interface VlsmTabProps {
  onNotify: (message: string, type: 'success' | 'info' | 'error') => void;
}

interface HostRequest {
  id: string;
  name: string;
  size: number;
}

export const VlsmTab: React.FC<VlsmTabProps> = ({ onNotify }) => {
  const [baseIp, setBaseIp] = useState('192.168.10.0');
  const [baseCidr, setBaseCidr] = useState<number>(24);
  const [hostRequests, setHostRequests] = useState<HostRequest[]>([
    { id: '1', name: 'Engineering', size: 120 },
    { id: '2', name: 'Sales & Marketing', size: 50 },
    { id: '3', name: 'HR & Admin', size: 25 },
    { id: '4', name: 'Management', size: 10 },
    { id: '5', name: 'VoIP Devices', size: 5 },
  ]);

  const [hasCalculated, setHasCalculated] = useState(false);
  
  // OSINT Tree states
  const [visualMode, setVisualMode] = useState<'blocks' | 'tree'>('blocks');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const isBaseIpValid = useMemo(() => validateIp(baseIp), [baseIp]);

  // Execute VLSM allocation
  const vlsmResults = useMemo(() => {
    if (!isBaseIpValid || !hasCalculated) return [];
    
    // Map to simple structure for the utility
    const requests = hostRequests.map(r => ({
      name: r.name || `Subnet (${r.size} hosts)`,
      size: r.size
    }));

    return calculateVLSM(baseIp, baseCidr, requests);
  }, [baseIp, baseCidr, hostRequests, isBaseIpValid, hasCalculated]);

  // Check if there was any unallocated subnet due to exhaustion
  const isAddressSpaceExhausted = useMemo(() => {
    return vlsmResults.some(res => res.networkAddress === 'Address Space Exhausted');
  }, [vlsmResults]);

  const handleAddRow = () => {
    const nextId = (Math.max(0, ...hostRequests.map(r => parseInt(r.id, 10))) + 1).toString();
    setHostRequests([
      ...hostRequests,
      { id: nextId, name: `Subnet ${nextId}`, size: 10 }
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (hostRequests.length <= 1) {
      onNotify('At least one subnet host request is required.', 'error');
      return;
    }
    setHostRequests(hostRequests.filter(r => r.id !== id));
  };

  const handleUpdateRow = (id: string, field: 'name' | 'size', value: any) => {
    setHostRequests(hostRequests.map(r => {
      if (r.id === id) {
        return {
          ...r,
          [field]: field === 'size' ? (isNaN(parseInt(value, 10)) ? 0 : Math.max(1, parseInt(value, 10))) : value
        };
      }
      return r;
    }));
  };

  const handleLoadPreset = () => {
    setHostRequests([
      { id: '1', name: 'VLAN 10 - Server Farm', size: 100 },
      { id: '2', name: 'VLAN 20 - Workstations', size: 60 },
      { id: '3', name: 'VLAN 30 - Wi-Fi Guest', size: 28 },
      { id: '4', name: 'VLAN 40 - VoIP Network', size: 14 },
      { id: '5', name: 'VLAN 50 - Management Printers', size: 6 }
    ]);
    setHasCalculated(false);
    onNotify('Loaded preset host sizes.', 'info');
  };

  const handleCalculate = () => {
    if (!isBaseIpValid) {
      onNotify('Invalid Base IP Network address.', 'error');
      return;
    }
    setHasCalculated(true);
    onNotify('VLSM subnets allocated successfully.', 'success');
  };

  const handleReset = () => {
    setBaseIp('192.168.10.0');
    setBaseCidr(24);
    setHostRequests([
      { id: '1', name: 'Subnet A', size: 50 },
      { id: '2', name: 'Subnet B', size: 20 },
      { id: '3', name: 'Subnet C', size: 10 }
    ]);
    setHasCalculated(false);
  };

  // CSV Exporter
  const handleExportCSV = () => {
    if (vlsmResults.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Subnet Name,Required Hosts,Usable Allocated,Network Address,First Usable,Last Usable,Broadcast Address,Default Gateway,Subnet Mask,CIDR,Wildcard\r\n";

    vlsmResults.forEach(sub => {
      csvContent += `"${sub.name}",${sub.requiredHosts},${sub.usableHosts},${sub.networkAddress},${sub.firstHost},${sub.lastHost},${sub.broadcastAddress},${sub.defaultGateway},${sub.subnetMask},/${sub.cidr},${sub.wildcardMask}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `subnetmaster_vlsm_${baseIp}_${baseCidr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify('VLSM CSV exported!', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  // Proportional Visualization data
  const totalBaseAddresses = useMemo(() => {
    return Math.pow(2, 32 - baseCidr);
  }, [baseCidr]);

  const treeMapBlocks = useMemo(() => {
    if (vlsmResults.length === 0 || isAddressSpaceExhausted) return [];

    return vlsmResults.map(res => {
      const allocatedSize = res.cidr === 0 ? 0 : Math.pow(2, 32 - res.cidr);
      const percentage = (allocatedSize / totalBaseAddresses) * 100;
      return {
        name: res.name,
        cidr: res.cidr,
        network: res.networkAddress,
        percentage: percentage,
        usable: res.usableHosts
      };
    });
  }, [vlsmResults, totalBaseAddresses, isAddressSpaceExhausted]);

  return (
    <div className="space-y-6">
      {/* Configuration Form */}
      <section className="glass-card p-6 border-slate-800/80 shadow-cyan-glow/5 relative overflow-hidden print-block">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/50 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
              <Network size={20} />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-100 print-text">VLSM Allocation Engine</h2>
              <p className="text-xs text-slate-400">Allocate variable subnet sizes optimally with zero routing address waste.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 no-print">
            <button 
              onClick={handleLoadPreset}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/40 text-xs text-slate-300 hover:bg-slate-850 hover:text-white flex items-center gap-1.5 transition-all"
            >
              Load VLAN Preset
            </button>
            <button 
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-850 text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-all"
            >
              <RefreshCw size={12} />
              Reset
            </button>
          </div>
        </div>

        {/* Base configuration inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-b border-slate-800/40 pb-5 mb-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              Base Network IP
              <span className={`w-2 h-2 rounded-full inline-block ${isBaseIpValid ? 'bg-cyan-400 animate-pulse' : 'bg-red-500'}`}></span>
            </label>
            <input 
              type="text" 
              value={baseIp}
              onChange={(e) => { setBaseIp(e.target.value); setHasCalculated(false); }}
              placeholder="e.g. 192.168.10.0"
              className={`w-full bg-slate-950/80 border text-slate-200 text-sm rounded-lg px-3.5 py-2.5 outline-none font-mono transition-all ${
                isBaseIpValid 
                  ? 'border-slate-800 focus:border-cyan-500/60' 
                  : 'border-red-800 focus:border-red-500'
              }`}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Base CIDR Prefix</label>
            <select
              value={baseCidr}
              onChange={(e) => { setBaseCidr(parseInt(e.target.value, 10)); setHasCalculated(false); }}
              className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 text-sm rounded-lg px-3.5 py-2.5 outline-none focus:border-cyan-500/60 font-mono"
            >
              {Array.from({ length: 25 }, (_, i) => i + 8).map(val => (
                <option key={val} value={val}>/{val} ({Math.pow(2, 32-val).toLocaleString()} IP addresses)</option>
              ))}
            </select>
          </div>

          <div className="flex items-end no-print">
            <button 
              onClick={handleCalculate}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 font-bold rounded-lg text-sm flex items-center justify-center gap-1.5 shadow-cyan-glow active:scale-98 transition-all"
            >
              <Play size={15} />
              Calculate Subnets
            </button>
          </div>
        </div>

        {/* Dynamic subnets sizing rows */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Required Host Groups</h3>
            <button 
              onClick={handleAddRow}
              className="px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/35 text-purple-400 hover:bg-purple-500/20 text-xs flex items-center gap-1 font-semibold no-print"
            >
              <Plus size={13} />
              Add Group
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {hostRequests.map((req, index) => (
              <div 
                key={req.id} 
                className="grid grid-cols-12 gap-3 items-center p-3 rounded-lg border border-slate-900/60 bg-slate-950/30 hover:border-slate-800 transition-all print-block"
              >
                <div className="col-span-1 text-slate-500 font-mono font-semibold text-center">
                  #{index + 1}
                </div>
                <div className="col-span-6">
                  <input 
                    type="text" 
                    value={req.name}
                    onChange={(e) => { handleUpdateRow(req.id, 'name', e.target.value); setHasCalculated(false); }}
                    placeholder={`e.g. Subnet #${index + 1}`}
                    className="w-full bg-slate-950/80 border border-slate-900 focus:border-cyan-500/40 text-slate-200 text-xs rounded px-2.5 py-1.5 outline-none font-medium"
                  />
                </div>
                <div className="col-span-4 flex items-center gap-2">
                  <input 
                    type="number" 
                    min="1"
                    value={req.size}
                    onChange={(e) => { handleUpdateRow(req.id, 'size', e.target.value); setHasCalculated(false); }}
                    className="w-full bg-slate-950/80 border border-slate-900 focus:border-cyan-500/40 text-slate-200 text-xs rounded px-2.5 py-1.5 outline-none font-mono text-center font-bold"
                  />
                  <span className="text-[10px] text-slate-500 font-medium">hosts</span>
                </div>
                <div className="col-span-1 text-center no-print">
                  <button 
                    onClick={() => { handleRemoveRow(req.id); setHasCalculated(false); }}
                    className="p-1.5 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Warning if exhausted */}
      {hasCalculated && isAddressSpaceExhausted && (
        <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-xl text-center">
          <p className="text-red-400 text-sm font-semibold flex items-center justify-center gap-2">
            <Info size={16} />
            Warning: Address Space Exhausted! The base subnet network /{baseCidr} is too small to accommodate all requested hosts. Increase base size.
          </p>
        </div>
      )}

      {/* VLSM allocation results */}
      {hasCalculated && vlsmResults.length > 0 && (
        <section className="glass-card p-6 border-slate-800/80 relative overflow-hidden print-block animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/50 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <Layers size={18} />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-100 print-text">VLSM Allocated Schemes</h3>
                <p className="text-xs text-slate-400">Allocations organized largest first to fit boundaries accurately.</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 no-print">
              {!isAddressSpaceExhausted && (
                <button 
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs transition-colors"
                >
                  <Download size={13} />
                  CSV
                </button>
              )}
              <button 
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs transition-colors"
              >
                <Printer size={13} />
                Print
              </button>
            </div>
          </div>

          <div className="overflow-x-auto -mx-6 sm:mx-0">
            <table className="w-full text-left font-mono border-collapse text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[10px] tracking-wider uppercase font-semibold text-slate-400">
                  <th className="p-3.5">Subnet Name</th>
                  <th className="p-3.5 text-center">Req. Size</th>
                  <th className="p-3.5 text-center">Alloc. Size</th>
                  <th className="p-3.5">Network Address</th>
                  <th className="p-3.5">Usable Range</th>
                  <th className="p-3.5">Broadcast IP</th>
                  <th className="p-3.5">Gateway</th>
                  <th className="p-3.5">Subnet Mask</th>
                  <th className="p-3.5">CIDR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {vlsmResults.map((sub, i) => {
                  const isFailed = sub.networkAddress === 'Address Space Exhausted';
                  return (
                    <tr 
                      key={i} 
                      className={`transition-colors ${
                        isFailed 
                          ? 'bg-red-950/10 hover:bg-red-950/15 text-red-400' 
                          : 'hover:bg-slate-900/25'
                      }`}
                    >
                      <td className="p-3.5 font-bold text-slate-100">{sub.name}</td>
                      <td className="p-3.5 text-center font-semibold text-slate-400">{sub.requiredHosts}</td>
                      <td className="p-3.5 text-center font-bold text-emerald-400">
                        {isFailed ? '0' : sub.usableHosts}
                      </td>
                      <td className={`p-3.5 font-bold select-all ${isFailed ? 'text-red-500 font-semibold' : 'text-slate-200'}`}>
                        {sub.networkAddress}
                      </td>
                      <td className="p-3.5">
                        {isFailed ? 'N/A' : `${sub.firstHost} - ${sub.lastHost}`}
                      </td>
                      <td className="p-3.5 text-slate-400">{sub.broadcastAddress}</td>
                      <td className="p-3.5 text-cyan-400">{sub.defaultGateway}</td>
                      <td className="p-3.5 text-slate-400">{sub.subnetMask}</td>
                      <td className="p-3.5 font-bold text-purple-400">
                        {isFailed ? 'N/A' : `/${sub.cidr}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Proportional TreeMap Visualization */}
      {hasCalculated && !isAddressSpaceExhausted && treeMapBlocks.length > 0 && (
        <section className="glass-card p-6 border-slate-800/80 relative overflow-hidden print-block">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/50 pb-3 mb-4 gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-100 print-text">Subnet Allocation Visualizer</h3>
                <p className="text-xs text-slate-400">View proportional subnet tree-maps or expand an interactive OSINT distribution tree.</p>
              </div>
            </div>

            {/* Mode selector */}
            <div className="flex items-center gap-3 self-end sm:self-auto no-print">
              <div className="flex rounded-lg p-0.5 bg-slate-950 border border-slate-850">
                <button 
                  onClick={() => setVisualMode('blocks')}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                    visualMode === 'blocks' 
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                      : 'text-slate-500 hover:text-slate-350'
                  }`}
                >
                  Proportional Map
                </button>
                <button 
                  onClick={() => setVisualMode('tree')}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                    visualMode === 'tree' 
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                      : 'text-slate-500 hover:text-slate-350'
                  }`}
                >
                  OSINT Cyber Tree
                </button>
              </div>
            </div>
          </div>

          {/* Graphical Split or OSINT Tree */}
          {visualMode === 'tree' ? (
            <div className="osint-tree select-text p-2 font-mono">
              <ul>
                <li>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleNode('root')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all hover:bg-slate-900/40 duration-200 select-none bg-slate-950/80 ${
                        expandedNodes.has('root') 
                          ? 'border-cyan-500/40 text-cyan-400 shadow-cyan-glow' 
                          : 'border-slate-800/80 text-slate-400'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${expandedNodes.has('root') ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.6)]' : 'bg-red-500'}`}></span>
                      <span className="font-bold">{baseIp}/{baseCidr} (Base Network Block)</span>
                    </button>
                  </div>
                  
                  {expandedNodes.has('root') && (
                    <ul>
                      {vlsmResults.map((sub, index) => {
                        const isFailed = sub.networkAddress === 'Address Space Exhausted';
                        if (isFailed) return null;
                        const subNodeId = `sub-${index}`;
                        const isSubExpanded = expandedNodes.has(subNodeId);
                        return (
                          <li key={index}>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => toggleNode(subNodeId)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-mono transition-all hover:bg-slate-900/40 duration-200 select-none bg-slate-950/80 ${
                                  isSubExpanded 
                                    ? 'border-purple-500/40 text-purple-400' 
                                    : 'border-slate-800/80 text-slate-400'
                                }`}
                              >
                                <span className={`w-2 h-2 rounded-full ${isSubExpanded ? 'bg-purple-400 animate-pulse shadow-[0_0_6px_rgba(189,0,255,0.5)]' : 'bg-slate-600'}`}></span>
                                <span className="font-bold">{sub.name}: {sub.networkAddress}/{sub.cidr}</span>
                              </button>
                            </div>
                            
                            {isSubExpanded && (
                              <ul>
                                <li>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-955/40 px-3 py-1.5 rounded-lg border border-slate-900 max-w-sm">
                                    <span className="text-slate-500 font-semibold uppercase text-[9px]">Required Size:</span>
                                    <span className="text-cyan-400 font-bold">{sub.requiredHosts} hosts</span>
                                  </div>
                                </li>
                                <li>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-955/40 px-3 py-1.5 rounded-lg border border-slate-900 max-w-sm">
                                    <span className="text-slate-500 font-semibold uppercase text-[9px]">Gateway IP:</span>
                                    <span className="text-cyan-400 font-bold select-all">{sub.defaultGateway}</span>
                                  </div>
                                </li>
                                <li>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-955/40 px-3 py-1.5 rounded-lg border border-slate-900 max-w-sm">
                                    <span className="text-slate-500 font-semibold uppercase text-[9px]">Usable Range:</span>
                                    <span className="text-emerald-400 font-bold select-all">{sub.firstHost} - {sub.lastHost}</span>
                                  </div>
                                </li>
                                <li>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-955/40 px-3 py-1.5 rounded-lg border border-slate-900 max-w-sm">
                                    <span className="text-slate-500 font-semibold uppercase text-[9px]">Broadcast Address:</span>
                                    <span className="text-slate-350 font-bold select-all">{sub.broadcastAddress}</span>
                                  </div>
                                </li>
                                <li>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-955/40 px-3 py-1.5 rounded-lg border border-slate-900 max-w-sm">
                                    <span className="text-slate-500 font-semibold uppercase text-[9px]">Subnet Mask:</span>
                                    <span className="text-slate-400 font-bold select-all">{sub.subnetMask}</span>
                                  </div>
                                </li>
                                <li>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-955/40 px-3 py-1.5 rounded-lg border border-slate-900 max-w-sm">
                                    <span className="text-slate-500 font-semibold uppercase text-[9px]">Wildcard Mask:</span>
                                    <span className="text-pink-400 font-bold select-all">{sub.wildcardMask}</span>
                                  </div>
                                </li>
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              </ul>
            </div>
          ) : (
            <div className="flex w-full min-h-[90px] rounded-xl overflow-hidden border border-slate-850 p-1 gap-1.5 bg-slate-950/60">
              {treeMapBlocks.map((block, idx) => (
                <div 
                  key={idx}
                  style={{ width: `${Math.max(4, block.percentage)}%` }}
                  className="min-h-[80px] p-2 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-lg flex flex-col justify-between hover:border-cyan-400 hover:shadow-cyan-glow/10 group transition-all"
                  title={`${block.name} (/${block.cidr}) - consuming ${block.percentage.toFixed(1)}% of base address space`}
                >
                  <div className="overflow-hidden">
                    <span className="block text-[9px] font-bold text-slate-500 group-hover:text-cyan-400 uppercase truncate">{block.name}</span>
                    <span className="block font-mono text-[10px] text-slate-300 font-semibold truncate mt-0.5">{block.network}</span>
                  </div>
                  <div className="flex items-end justify-between mt-1">
                    <span className="text-[9px] text-purple-400 font-bold font-mono">/{block.cidr}</span>
                    <span className="text-[8px] text-slate-600 font-semibold">{block.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
