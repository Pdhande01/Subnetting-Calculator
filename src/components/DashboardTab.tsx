import React, { useState, useMemo } from 'react';
import { 
  calculateSubnetDetails, 
  calculateFLSM, 
  getMaskFromCidr, 
  getCidrFromMask, 
  validateIp,
  ipToLong
} from '../utils/ipUtils';
import { 
  Search, 
  Download, 
  Copy, 
  Printer, 
  FileSpreadsheet, 
  Info,
  Maximize2,
  Minimize2,
  RefreshCw,
  Sliders,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardTabProps {
  onNotify: (message: string, type: 'success' | 'info' | 'error') => void;
  savedHistory: any[];
  setSavedHistory: React.Dispatch<React.SetStateAction<any[]>>;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ onNotify, savedHistory, setSavedHistory }) => {
  // Input states
  const [ipInput, setIpInput] = useState('192.168.10.0');
  const [cidr, setCidr] = useState<number>(24);
  const [subnetCount, setSubnetCount] = useState<string>('');
  const [hostsPerSubnet, setHostsPerSubnet] = useState<string>('');

  // Pagination and search
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(5);
  const [sortField, setSortField] = useState<'subnetNumber' | 'networkAddress' | 'usableHosts'>('subnetNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Interactive states
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [activeVisualSubnet, setActiveVisualSubnet] = useState<number | null>(null);
  
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

  // Derived calculations
  const isIpValid = useMemo(() => validateIp(ipInput), [ipInput]);

  const subnetDetails = useMemo(() => {
    if (!isIpValid) return null;
    try {
      return calculateSubnetDetails(ipInput, cidr);
    } catch (e) {
      return null;
    }
  }, [ipInput, cidr, isIpValid]);

  // Synchronize CIDR and Mask
  const subnetMask = useMemo(() => getMaskFromCidr(cidr), [cidr]);

  // Generate masks list for dropdown
  const maskOptions = useMemo(() => {
    const options = [];
    for (let c = 1; c <= 32; c++) {
      options.push({ cidr: c, mask: getMaskFromCidr(c) });
    }
    return options;
  }, []);

  const handleMaskChange = (mask: string) => {
    const foundCidr = getCidrFromMask(mask);
    setCidr(foundCidr);
  };

  // Check if number of subnets needed fits into remaining bits
  const flsmSubnetsCount = useMemo(() => {
    const count = parseInt(subnetCount, 10);
    return isNaN(count) || count <= 0 ? 0 : count;
  }, [subnetCount]);

  // FLSM subnets generator
  const flsmSubnets = useMemo(() => {
    if (!isIpValid || flsmSubnetsCount <= 0) return [];
    return calculateFLSM(ipInput, cidr, flsmSubnetsCount);
  }, [ipInput, cidr, flsmSubnetsCount, isIpValid]);

  // Save current calculation to history
  const handleSaveToHistory = () => {
    if (!subnetDetails) return;
    const historyItem = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      ipAddress: subnetDetails.ipAddress,
      cidr: subnetDetails.cidr,
      subnetMask: subnetDetails.subnetMask,
      networkAddress: subnetDetails.networkAddress,
      broadcastAddress: subnetDetails.broadcastAddress,
      usableRange: `${subnetDetails.firstUsableHost} - ${subnetDetails.lastUsableHost}`
    };

    const updated = [historyItem, ...savedHistory.slice(0, 19)]; // limit to 20
    setSavedHistory(updated);
    localStorage.setItem('subnet_history', JSON.stringify(updated));
    onNotify('Calculation saved to local history!', 'success');
  };

  // Share calculation via URL
  const handleShareURL = () => {
    if (!subnetDetails) return;
    const params = new URLSearchParams();
    params.set('ip', subnetDetails.ipAddress);
    params.set('cidr', subnetDetails.cidr.toString());
    if (subnetCount) params.set('subnets', subnetCount);
    
    const newUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(newUrl);
    onNotify('Share URL copied to clipboard!', 'success');
  };

  // Copy values helpers
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    onNotify(`${label} copied to clipboard!`, 'success');
  };

  // CSV Exporter
  const handleExportCSV = () => {
    if (flsmSubnets.length === 0) {
      onNotify('No generated subnets list to export. Add "Number of Required Subnets" first.', 'error');
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Subnet Number,Network Address,First Usable Host,Last Usable Host,Broadcast Address,Default Gateway,Subnet Mask,CIDR,Wildcard Mask,Usable Hosts\r\n";

    flsmSubnets.forEach(sub => {
      csvContent += `${sub.subnetNumber},${sub.networkAddress},${sub.firstHost},${sub.lastHost},${sub.broadcastAddress},${sub.defaultGateway},${sub.subnetMask},/${sub.cidr},${sub.wildcardMask},${sub.usableHosts}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `subnetmaster_flsm_${ipInput}_${cidr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify('CSV downloaded successfully!', 'success');
  };

  // Print & PDF Exporter
  const handlePrint = () => {
    window.print();
  };

  // Table pagination and sorting
  const sortedSubnets = useMemo(() => {
    if (flsmSubnets.length === 0) return [];
    const sorted = [...flsmSubnets];
    sorted.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      // Convert IP addresses to long for correct IP comparison sorting
      if (sortField === 'networkAddress') {
        valA = ipToLong(a.networkAddress);
        valB = ipToLong(b.networkAddress);
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    if (searchTerm) {
      return sorted.filter(sub => 
        sub.networkAddress.includes(searchTerm) || 
        sub.firstHost.includes(searchTerm) ||
        sub.lastHost.includes(searchTerm) ||
        sub.broadcastAddress.includes(searchTerm)
      );
    }
    return sorted;
  }, [flsmSubnets, sortField, sortDirection, searchTerm]);

  const paginatedSubnets = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedSubnets.slice(startIndex, startIndex + pageSize);
  }, [sortedSubnets, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedSubnets.length / pageSize);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Interactive Bit Borrowing Helper
  const defaultClassCidr = useMemo(() => {
    if (!isIpValid) return 8;
    const firstOctet = parseInt(ipInput.split('.')[0], 10);
    if (firstOctet >= 1 && firstOctet <= 126) return 8; // Class A
    if (firstOctet >= 128 && firstOctet <= 191) return 16; // Class B
    if (firstOctet >= 192 && firstOctet <= 223) return 24; // Class C
    return 8;
  }, [ipInput, isIpValid]);

  const renderBitBoxes = () => {
    const boxes = [];
    for (let bitIndex = 1; bitIndex <= 32; bitIndex++) {
      let bitType: 'network' | 'subnet' | 'host' = 'host';
      if (bitIndex <= defaultClassCidr) {
        bitType = 'network';
      } else if (bitIndex <= cidr) {
        bitType = 'subnet';
      }

      // Check if current bit is 1 or 0 in the subnet mask
      const isBitActive = bitIndex <= cidr;

      boxes.push(
        <button
          key={bitIndex}
          onClick={() => setCidr(bitIndex)}
          className={`w-7 h-7 sm:w-8 sm:h-8 flex flex-col items-center justify-center rounded border text-[10px] font-mono transition-all duration-200 ${
            bitType === 'network' 
              ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20'
              : bitType === 'subnet'
              ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 hover:bg-purple-500/30'
              : 'bg-slate-800/40 border-slate-700/60 text-slate-500 hover:bg-slate-700/40 hover:text-slate-300'
          } ${isBitActive ? 'ring-1 ring-offset-1 ring-offset-slate-950 ring-cyan-500/40' : ''}`}
          title={`Bit ${bitIndex}: ${bitType === 'network' ? 'Default Net' : bitType === 'subnet' ? 'Borrowed Subnet' : 'Host'} bit`}
        >
          <span className="font-bold text-xs">{isBitActive ? '1' : '0'}</span>
          <span className="text-[7px] text-slate-400 opacity-60 leading-none">{bitIndex}</span>
        </button>
      );

      // Add separator dots between octets
      if (bitIndex % 8 === 0 && bitIndex !== 32) {
        boxes.push(
          <div key={`dot-${bitIndex}`} className="flex items-end pb-2 justify-center text-slate-600 font-bold self-end text-lg select-none px-0.5">
            .
          </div>
        );
      }
    }
    return boxes;
  };

  const handleReset = () => {
    setIpInput('192.168.10.0');
    setCidr(24);
    setSubnetCount('');
    setHostsPerSubnet('');
    setSearchTerm('');
    setCurrentPage(1);
    onNotify('Calculator reset to defaults.', 'info');
  };

  // Sync hosts request with subnets count
  const handleHostsChange = (val: string) => {
    setHostsPerSubnet(val);
    const count = parseInt(val, 10);
    if (!isNaN(count) && count > 0 && subnetDetails) {
      // If we need custom host size, what subnet mask fits it?
      // A subnet of size H requires 2^(32-C) - 2 >= H -> 2^(32-C) >= H + 2.
      // So 32 - C = ceil(log2(H + 2)) -> C = 32 - ceil(log2(H + 2)).
      const hostsNeeded = count + 2;
      const bitsNeeded = Math.ceil(Math.log2(hostsNeeded));
      const fitCidr = Math.max(0, 32 - bitsNeeded);
      setCidr(fitCidr);
      onNotify(`Auto-configured CIDR /${fitCidr} to support at least ${count} hosts!`, 'info');
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration & Inputs Section */}
      <section className="glass-card p-6 border-slate-800/80 shadow-cyan-glow/5 relative overflow-hidden print-block">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/50 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
              <Sliders size={20} />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-100 print-text">Subnet Configuration</h2>
              <p className="text-xs text-slate-400">Configure parameters for instant real-time IPv4 subnetworking.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/40 text-xs text-slate-300 hover:bg-slate-850 hover:text-white flex items-center gap-1.5 active:scale-95 transition-all no-print"
            >
              <RefreshCw size={13} />
              Reset
            </button>
            <button 
              onClick={handleSaveToHistory}
              disabled={!subnetDetails}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/40 text-xs text-slate-300 hover:bg-slate-850 hover:text-white flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50 no-print"
            >
              <Layers size={13} />
              Save History
            </button>
            <button 
              onClick={handleShareURL}
              disabled={!subnetDetails}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-xs text-cyan-400 hover:bg-cyan-500/25 flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50 no-print"
            >
              <Sparkles size={13} />
              Share Link
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {/* IP Address */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              IP Address
              <span className={`w-2 h-2 rounded-full inline-block ${isIpValid ? 'bg-cyan-400 animate-pulse' : 'bg-red-500'}`}></span>
            </label>
            <input 
              type="text" 
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              placeholder="e.g. 192.168.10.0"
              className={`w-full bg-slate-950/80 border text-slate-200 text-sm rounded-lg px-3.5 py-2.5 outline-none font-mono transition-all ${
                isIpValid 
                  ? 'border-slate-800 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/20' 
                  : 'border-red-800 focus:border-red-500 focus:ring-1 focus:ring-red-500/20'
              }`}
            />
          </div>

          {/* CIDR Prefix Dropdown */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">CIDR Prefix</label>
            <select
              value={cidr}
              onChange={(e) => setCidr(parseInt(e.target.value, 10))}
              className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 text-sm rounded-lg px-3.5 py-2.5 outline-none focus:border-cyan-500/60 font-mono"
            >
              {Array.from({ length: 32 }, (_, i) => i + 1).map(val => (
                <option key={val} value={val}>/{val}</option>
              ))}
            </select>
          </div>

          {/* Subnet Mask Sync Dropdown */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Subnet Mask</label>
            <select
              value={subnetMask}
              onChange={(e) => handleMaskChange(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 text-sm rounded-lg px-3.5 py-2.5 outline-none focus:border-cyan-500/60 font-mono"
            >
              {maskOptions.map(opt => (
                <option key={opt.cidr} value={opt.mask}>{opt.mask} (/{opt.cidr})</option>
              ))}
            </select>
          </div>

          {/* Number of Required Subnets */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              Subnets (FLSM)
              <span className="text-[10px] text-slate-500 font-normal">(Optional)</span>
            </label>
            <input 
              type="number" 
              min="1"
              value={subnetCount}
              onChange={(e) => setSubnetCount(e.target.value)}
              placeholder="e.g. 8"
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/20 text-slate-200 text-sm rounded-lg px-3.5 py-2.5 outline-none font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-4">
          {/* Hosts Per Subnet Configurator */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              Hosts Per Subnet
              <span className="text-[10px] text-slate-500 font-normal">(Auto-fits Mask)</span>
            </label>
            <input 
              type="number" 
              min="1"
              value={hostsPerSubnet}
              onChange={(e) => handleHostsChange(e.target.value)}
              placeholder="e.g. 50"
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/20 text-slate-200 text-sm rounded-lg px-3.5 py-2.5 outline-none font-mono"
            />
          </div>
        </div>
      </section>

      {/* Interactive Bit Borrowing Visualizer */}
      {subnetDetails && (
        <section className="glass-card p-6 border-slate-800/80 shadow-cyan-glow/5 relative overflow-hidden print-block">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-800/50 pb-3">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 print-text">Interactive Binary Bit Borrowing</h3>
              <p className="text-xs text-slate-400">Click a box to adjust the prefix mask length. Observe Network vs Host partitions.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5 md:gap-2 p-4 bg-slate-950/50 rounded-xl border border-slate-900 shadow-inner">
            {renderBitBoxes()}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded bg-cyan-500/10 border border-cyan-500/50"></div>
              <span className="text-slate-400">Default Class Bits ({defaultClassCidr})</span>
            </div>
            {cidr > defaultClassCidr && (
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-purple-500/15 border border-purple-500/50"></div>
                <span className="text-slate-400">Borrowed Subnet Bits ({cidr - defaultClassCidr})</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded bg-slate-800/50 border border-slate-700/60"></div>
              <span className="text-slate-400">Host Bits ({32 - cidr})</span>
            </div>
          </div>
        </section>
      )}

      {/* Metrics Dashboard Results Grid */}
      <AnimatePresence mode="wait">
        {!isIpValid ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-6 bg-red-950/20 border border-red-900/40 rounded-xl text-center"
          >
            <p className="text-red-400 text-sm font-semibold flex items-center justify-center gap-2">
              <Info size={16} />
              Please enter a valid IPv4 address (e.g. 192.168.10.0) to compute subnet properties.
            </p>
          </motion.div>
        ) : subnetDetails && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
          >
            {/* Card 1: Network Address */}
            <div className="glass-card p-4 flex flex-col justify-between glass-card-hover group relative overflow-hidden print-block">
              <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 group-hover:h-full transition-all"></div>
              <span className="text-[10px] tracking-wider uppercase font-semibold text-slate-500">Network Address</span>
              <div className="mt-2 font-mono font-bold text-lg text-slate-100 flex items-center justify-between">
                <span>{subnetDetails.networkAddress}</span>
                <button 
                  onClick={() => handleCopyText(subnetDetails.networkAddress, 'Network Address')}
                  className="text-slate-500 hover:text-cyan-400 transition-colors no-print"
                >
                  <Copy size={13} />
                </button>
              </div>
              <span className="text-[9px] text-slate-500 font-mono mt-1 block">Start of Block</span>
            </div>

            {/* Card 2: Broadcast Address */}
            <div className="glass-card p-4 flex flex-col justify-between glass-card-hover group relative overflow-hidden print-block">
              <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 group-hover:h-full transition-all"></div>
              <span className="text-[10px] tracking-wider uppercase font-semibold text-slate-500">Broadcast Address</span>
              <div className="mt-2 font-mono font-bold text-lg text-slate-100 flex items-center justify-between">
                <span>{subnetDetails.broadcastAddress}</span>
                <button 
                  onClick={() => handleCopyText(subnetDetails.broadcastAddress, 'Broadcast Address')}
                  className="text-slate-500 hover:text-purple-400 transition-colors no-print"
                >
                  <Copy size={13} />
                </button>
              </div>
              <span className="text-[9px] text-slate-500 font-mono mt-1 block">End of Block</span>
            </div>

            {/* Card 3: Subnet Mask */}
            <div className="glass-card p-4 flex flex-col justify-between glass-card-hover group relative overflow-hidden print-block">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 group-hover:h-full transition-all"></div>
              <span className="text-[10px] tracking-wider uppercase font-semibold text-slate-500">Subnet Mask</span>
              <div className="mt-2 font-mono font-bold text-lg text-slate-100 flex items-center justify-between">
                <span>{subnetDetails.subnetMask}</span>
                <button 
                  onClick={() => handleCopyText(subnetDetails.subnetMask, 'Subnet Mask')}
                  className="text-slate-500 hover:text-emerald-400 transition-colors no-print"
                >
                  <Copy size={13} />
                </button>
              </div>
              <span className="text-[9px] text-slate-500 font-mono mt-1 block">Prefix size: /{subnetDetails.cidr}</span>
            </div>

            {/* Card 4: Wildcard Mask */}
            <div className="glass-card p-4 flex flex-col justify-between glass-card-hover group relative overflow-hidden print-block">
              <div className="absolute top-0 left-0 w-1 h-full bg-pink-500 group-hover:h-full transition-all"></div>
              <span className="text-[10px] tracking-wider uppercase font-semibold text-slate-500">Wildcard Mask</span>
              <div className="mt-2 font-mono font-bold text-lg text-slate-100 flex items-center justify-between">
                <span>{subnetDetails.wildcardMask}</span>
                <button 
                  onClick={() => handleCopyText(subnetDetails.wildcardMask, 'Wildcard Mask')}
                  className="text-slate-500 hover:text-pink-400 transition-colors no-print"
                >
                  <Copy size={13} />
                </button>
              </div>
              <span className="text-[9px] text-slate-500 font-mono mt-1 block">Inverted Mask</span>
            </div>

            {/* Card 5: CIDR & Range */}
            <div className="glass-card p-4 flex flex-col justify-between glass-card-hover group relative overflow-hidden print-block">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 group-hover:h-full transition-all"></div>
              <span className="text-[10px] tracking-wider uppercase font-semibold text-slate-500">CIDR Notation</span>
              <div className="mt-2 font-mono font-bold text-lg text-slate-100 flex items-center justify-between">
                <span>/{subnetDetails.cidr}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                  {subnetDetails.addressClass}
                </span>
              </div>
              <span className="text-[9px] text-slate-500 font-mono mt-1 block">Network size spec</span>
            </div>

            {/* Card 6: Usable IP Range */}
            <div className="glass-card p-4 sm:col-span-2 flex flex-col justify-between glass-card-hover group print-block">
              <span className="text-[10px] tracking-wider uppercase font-semibold text-slate-500">Usable Host Range</span>
              <div className="mt-2 font-mono font-semibold text-[13px] sm:text-sm text-cyan-400 flex items-center gap-1.5">
                <span>{subnetDetails.firstUsableHost}</span>
                <ArrowRight size={12} className="text-slate-600" />
                <span>{subnetDetails.lastUsableHost}</span>
              </div>
              <span className="text-[9px] text-slate-500 font-mono mt-1 block">Excluding Net & Broadcast addresses</span>
            </div>

            {/* Card 7: Total & Usable Hosts */}
            <div className="glass-card p-4 flex flex-col justify-between glass-card-hover group print-block">
              <span className="text-[10px] tracking-wider uppercase font-semibold text-slate-500">Usable Hosts</span>
              <div className="mt-2 font-mono font-bold text-lg text-emerald-400 flex items-baseline gap-1">
                <span>{subnetDetails.usableHosts.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500">/ {subnetDetails.totalHosts.toLocaleString()}</span>
              </div>
              <span className="text-[9px] text-slate-500 font-mono mt-1 block">Total addresses: 2^{(subnetDetails.hostBits)}</span>
            </div>

            {/* Card 8: Designation Status */}
            <div className="glass-card p-4 flex flex-col justify-between glass-card-hover group print-block">
              <span className="text-[10px] tracking-wider uppercase font-semibold text-slate-500">Network Type</span>
              <div className="mt-2 font-bold text-sm text-slate-200">
                {subnetDetails.ipType === 'Private' ? (
                  <span className="text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25">Private</span>
                ) : subnetDetails.ipType === 'Special' ? (
                  <span className="text-purple-400 font-semibold px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/25">Special</span>
                ) : (
                  <span className="text-cyan-400 font-semibold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/25">Public</span>
                )}
              </div>
              <span className="text-[9px] text-slate-500 font-mono mt-1 block truncate">
                {subnetDetails.rfcInfo || 'RFC 791'}
              </span>
            </div>

            {/* Card 9: Info Details */}
            <div className="glass-card p-4 flex flex-col justify-between glass-card-hover group print-block">
              <span className="text-[10px] tracking-wider uppercase font-semibold text-slate-500">Subnet Bits Partition</span>
              <div className="mt-2 font-mono text-[13px] text-slate-300">
                <span className="text-cyan-400 font-bold">{subnetDetails.networkBits}N</span>
                <span className="text-slate-600"> / </span>
                <span className="text-purple-400 font-bold">{subnetDetails.hostBits}H</span>
              </div>
              <span className="text-[9px] text-slate-500 font-mono mt-1 block">32-Bit Unicast Split</span>
            </div>

            {/* Card 10: Full Binary Table debugger */}
            <div className="glass-card p-5 sm:col-span-2 lg:col-span-5 flex flex-col justify-between border-slate-800 shadow-inner print-block">
              <span className="text-xs font-semibold text-slate-400 border-b border-slate-800/40 pb-2 mb-3">Binary Bit Debugger Block</span>
              <div className="space-y-2.5 font-mono text-xs text-slate-300">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-1.5 border-b border-slate-900 pb-1.5">
                  <span className="text-slate-500 font-semibold uppercase text-[10px]">Type</span>
                  <span className="text-slate-400 font-semibold sm:col-span-2">Binary Code Layout</span>
                  <span className="text-slate-500 font-semibold text-[10px] sm:text-right">Decimal Value</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-1.5 items-center">
                  <span className="text-slate-400 font-medium">IP Address:</span>
                  <span className="sm:col-span-2 font-bold text-slate-200 select-all tracking-wider">{subnetDetails.binaryIp}</span>
                  <span className="text-cyan-400 sm:text-right font-semibold">{subnetDetails.ipAddress}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-1.5 items-center">
                  <span className="text-slate-400 font-medium">Subnet Mask:</span>
                  <span className="sm:col-span-2 font-bold text-emerald-400 select-all tracking-wider">{subnetDetails.binaryMask}</span>
                  <span className="text-emerald-400 sm:text-right font-semibold">{subnetDetails.subnetMask}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-1.5 items-center">
                  <span className="text-slate-400 font-medium">Network ID:</span>
                  <span className="sm:col-span-2 font-bold text-cyan-500/70 select-all tracking-wider">{subnetDetails.binaryNetwork}</span>
                  <span className="text-cyan-500/70 sm:text-right font-semibold">{subnetDetails.networkAddress}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-1.5 items-center">
                  <span className="text-slate-400 font-medium">Broadcast:</span>
                  <span className="sm:col-span-2 font-bold text-purple-400/80 select-all tracking-wider">{subnetDetails.binaryBroadcast}</span>
                  <span className="text-purple-400/80 sm:text-right font-semibold">{subnetDetails.broadcastAddress}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visual Subnet blocks representation */}
      {subnetDetails && (
        <section className="glass-card p-6 border-slate-800/80 relative overflow-hidden print-block">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/50 pb-3 mb-4 gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-pink-500/10 text-pink-400 rounded-lg">
                <Maximize2 size={18} />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-100 print-text">Subnet Allocation Visualizer</h3>
                <p className="text-xs text-slate-400">View proportional subnet partitions or expand an interactive OSINT distribution tree.</p>
              </div>
            </div>
            
            {/* Mode Selector and zoom controls */}
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
                  Block Map
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

              {visualMode === 'blocks' && (
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                    className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
                    title="Zoom Out"
                  >
                    <Minimize2 size={13} />
                  </button>
                  <span className="text-xs text-slate-400 font-mono w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
                  <button 
                    onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.25))}
                    className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
                    title="Zoom In"
                  >
                    <Maximize2 size={13} />
                  </button>
                </div>
              )}
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
                      <span className="font-bold">{subnetDetails.networkAddress}/{subnetDetails.cidr} (Base Network Block)</span>
                    </button>
                  </div>
                  
                  {expandedNodes.has('root') && (
                    <ul>
                      {flsmSubnets.length > 0 ? (
                        flsmSubnets.map(sub => {
                          const subNodeId = `sub-${sub.subnetNumber}`;
                          const isSubExpanded = expandedNodes.has(subNodeId);
                          return (
                            <li key={sub.subnetNumber}>
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
                                  <span className="font-bold">Subnet {sub.subnetNumber}: {sub.networkAddress}/{sub.cidr}</span>
                                </button>
                              </div>
                              
                              {isSubExpanded && (
                                <ul>
                                  <li>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-955/40 px-3 py-1.5 rounded-lg border border-slate-900 max-w-sm">
                                      <span className="text-slate-500 font-semibold uppercase text-[9px]">Gateway IP:</span>
                                      <span className="text-cyan-400 font-bold select-all">{sub.defaultGateway}</span>
                                    </div>
                                  </li>
                                  <li>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-955/40 px-3 py-1.5 rounded-lg border border-slate-900 max-w-sm">
                                      <span className="text-slate-500 font-semibold uppercase text-[9px]">Host Range:</span>
                                      <span className="text-emerald-400 font-bold select-all">{sub.firstHost} - {sub.lastHost}</span>
                                    </div>
                                  </li>
                                  <li>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-955/40 px-3 py-1.5 rounded-lg border border-slate-900 max-w-sm">
                                      <span className="text-slate-500 font-semibold uppercase text-[9px]">Broadcast:</span>
                                      <span className="text-slate-300 font-bold select-all">{sub.broadcastAddress}</span>
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
                                      <span className="text-slate-500 font-semibold uppercase text-[9px]">Wildcard:</span>
                                      <span className="text-pink-400 font-bold select-all">{sub.wildcardMask}</span>
                                    </div>
                                  </li>
                                  <li>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-955/40 px-3 py-1.5 rounded-lg border border-slate-900 max-w-md overflow-x-auto">
                                      <span className="text-slate-500 font-semibold uppercase text-[9px] shrink-0">Binary ID:</span>
                                      <span className="text-slate-500 font-bold select-all tracking-wider text-[9px]">{sub.binaryNetwork}</span>
                                    </div>
                                  </li>
                                </ul>
                              )}
                            </li>
                          );
                        })
                      ) : (
                        <>
                          <li>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-955/40 px-3 py-1.5 rounded-lg border border-slate-900 max-w-sm">
                              <span className="text-slate-500 font-semibold uppercase text-[9px]">Usable Range:</span>
                              <span className="text-cyan-400 font-bold select-all">{subnetDetails.firstUsableHost} - {subnetDetails.lastUsableHost}</span>
                            </div>
                          </li>
                          <li>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-955/40 px-3 py-1.5 rounded-lg border border-slate-900 max-w-sm">
                              <span className="text-slate-500 font-semibold uppercase text-[9px]">Broadcast Address:</span>
                              <span className="text-slate-300 font-bold select-all">{subnetDetails.broadcastAddress}</span>
                            </div>
                          </li>
                          <li>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-955/40 px-3 py-1.5 rounded-lg border border-slate-900 max-w-sm">
                              <span className="text-slate-500 font-semibold uppercase text-[9px]">Subnet Mask:</span>
                              <span className="text-emerald-400 font-bold select-all">{subnetDetails.subnetMask}</span>
                            </div>
                          </li>
                          <li>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-955/40 px-3 py-1.5 rounded-lg border border-slate-900 max-w-sm">
                              <span className="text-slate-500 font-semibold uppercase text-[9px]">Wildcard Mask:</span>
                              <span className="text-pink-400 font-bold select-all">{subnetDetails.wildcardMask}</span>
                            </div>
                          </li>
                        </>
                      )}
                    </ul>
                  )}
                </li>
              </ul>
            </div>
          ) : (
            <div className="overflow-x-auto p-2 bg-slate-950/40 border border-slate-900/60 rounded-xl">
              <div 
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
                className="transition-transform duration-200"
              >
                {flsmSubnetsCount > 0 && flsmSubnets.length > 0 ? (
                  <div>
                    <p className="text-xs text-slate-500 mb-2 font-mono">
                      Splitting network {subnetDetails.networkAddress}/{subnetDetails.cidr} into {flsmSubnets.length} subnets of size /{flsmSubnets[0].cidr}:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 min-w-[700px] py-2">
                      {flsmSubnets.map((sub, index) => (
                        <div 
                          key={sub.subnetNumber}
                          onMouseEnter={() => setActiveVisualSubnet(index)}
                          onMouseLeave={() => setActiveVisualSubnet(null)}
                          className={`p-3 rounded-lg border text-center transition-all ${
                            activeVisualSubnet === index
                              ? 'bg-cyan-500/10 border-cyan-400/80 shadow-cyan-glow'
                              : 'bg-slate-900/40 border-slate-800'
                          }`}
                        >
                          <span className="block text-[10px] text-slate-500 font-bold uppercase">Subnet {sub.subnetNumber}</span>
                          <span className="block font-mono text-[11px] font-bold text-slate-300 mt-1 truncate">{sub.networkAddress}</span>
                          <span className="block text-[9px] text-cyan-400 font-mono mt-0.5">/{sub.cidr}</span>
                          <span className="block text-[8px] text-slate-500 mt-1">{sub.usableHosts} usable hosts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
                    <Layers size={36} className="text-slate-700 mb-2" />
                    <p className="text-sm font-semibold">No split subnets defined.</p>
                    <p className="text-xs text-slate-600 mt-0.5">Enter "Number of Required Subnets" in config block to view segment visual splits.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* FLSM Subnets Table */}
      {flsmSubnetsCount > 0 && flsmSubnets.length > 0 && (
        <section className="glass-card p-6 border-slate-800/80 relative overflow-hidden print-block">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/50 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-100 print-text">FLSM Generated Subnets Table</h3>
                <p className="text-xs text-slate-400">Listing of split networks derived from {subnetDetails?.networkAddress}/{subnetDetails?.cidr}.</p>
              </div>
            </div>
            
            {/* Search and Exports */}
            <div className="flex flex-wrap items-center gap-2.5 no-print">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  placeholder="Filter address..."
                  className="bg-slate-950/80 border border-slate-800 focus:border-cyan-500/60 text-slate-300 text-xs rounded-lg pl-9 pr-3.5 py-2.5 outline-none font-mono w-44"
                />
              </div>
              
              <button 
                onClick={handleExportCSV}
                className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center gap-1.5 text-xs transition-colors"
                title="Export CSV"
              >
                <Download size={13} />
                <span>CSV</span>
              </button>

              <button 
                onClick={handlePrint}
                className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center gap-1.5 text-xs transition-colors"
                title="Print Details / Save PDF"
              >
                <Printer size={13} />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* Subnet List Table */}
          <div className="overflow-x-auto -mx-6 sm:mx-0">
            <table className="w-full text-left font-mono border-collapse text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[10px] tracking-wider uppercase font-semibold text-slate-400">
                  <th className="p-3.5 cursor-pointer hover:text-cyan-400 select-none" onClick={() => handleSort('subnetNumber')}>
                    No {sortField === 'subnetNumber' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="p-3.5 cursor-pointer hover:text-cyan-400 select-none" onClick={() => handleSort('networkAddress')}>
                    Network IP {sortField === 'networkAddress' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="p-3.5 text-slate-500">Usable Host Range</th>
                  <th className="p-3.5 text-slate-500">Broadcast IP</th>
                  <th className="p-3.5 text-slate-500">Default Gateway</th>
                  <th className="p-3.5 text-slate-500">Mask / CIDR</th>
                  <th className="p-3.5 cursor-pointer hover:text-cyan-400 select-none" onClick={() => handleSort('usableHosts')}>
                    Hosts {sortField === 'usableHosts' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="p-3.5 text-center no-print">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {paginatedSubnets.length > 0 ? (
                  paginatedSubnets.map(sub => (
                    <tr key={sub.subnetNumber} className="hover:bg-slate-900/25 transition-colors">
                      <td className="p-3.5 font-bold text-slate-400">#{sub.subnetNumber}</td>
                      <td className="p-3.5 text-slate-100 font-bold select-all">{sub.networkAddress}</td>
                      <td className="p-3.5 text-slate-300">
                        {sub.firstHost} - {sub.lastHost}
                      </td>
                      <td className="p-3.5 text-slate-400">{sub.broadcastAddress}</td>
                      <td className="p-3.5 text-cyan-500/80">{sub.defaultGateway}</td>
                      <td className="p-3.5 text-slate-400">
                        {sub.subnetMask} <span className="text-cyan-400">/{sub.cidr}</span>
                      </td>
                      <td className="p-3.5 text-emerald-400 font-bold">{sub.usableHosts}</td>
                      <td className="p-3.5 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => handleCopyText(sub.networkAddress, 'Network Address')}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400"
                            title="Copy Network IP"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No matching subnets found. Check query search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-800/80 pt-4 mt-4 text-xs no-print">
              <span className="text-slate-500 font-mono">
                Showing {Math.min(sortedSubnets.length, (currentPage - 1) * pageSize + 1)}-{Math.min(sortedSubnets.length, currentPage * pageSize)} of {sortedSubnets.length} Subnets
              </span>
              <div className="flex items-center gap-2">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white disabled:opacity-40"
                >
                  Prev
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button 
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 rounded-lg text-xs font-mono font-bold ${
                        currentPage === page 
                          ? 'bg-cyan-500/10 border border-cyan-500/35 text-cyan-400' 
                          : 'border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
