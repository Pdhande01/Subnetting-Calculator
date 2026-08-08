import React, { useState, useMemo } from 'react';
import { 
  getMaskFromCidr, 
  getWildcardMask,
  calculateSubnetDetails, 
  validateIp
} from '../utils/ipUtils';
import {
  Sliders, 
  Binary, 
  BookOpen, 
  Search, 
  Info,
  List
} from 'lucide-react';

export const UtilityTab: React.FC = () => {
  // --- Tab 1: Host Calculator ---
  const [hostsNeeded, setHostsNeeded] = useState<string>('50');

  const hostCalculatorResults = useMemo(() => {
    const needed = parseInt(hostsNeeded, 10);
    if (isNaN(needed) || needed <= 0) return null;

    // We need 2^(32-C) - 2 >= needed (for CIDR <= 30)
    // For /31 it is 2 usable. For /32 it is 1 usable.
    let bestCidr = 32;
    for (let c = 32; c >= 0; c--) {
      let usable = 0;
      if (c === 32) usable = 1;
      else if (c === 31) usable = 2;
      else usable = Math.pow(2, 32 - c) - 2;

      if (usable >= needed) {
        bestCidr = c;
        break;
      }
    }

    const totalHostsCount = Math.pow(2, 32 - bestCidr);
    let usableHostsCount = 0;
    if (bestCidr === 32) usableHostsCount = 1;
    else if (bestCidr === 31) usableHostsCount = 2;
    else usableHostsCount = totalHostsCount - 2;

    const unusedHosts = usableHostsCount - needed;

    return {
      bestCidr,
      subnetMask: getMaskFromCidr(bestCidr),
      availableHosts: totalHostsCount,
      usableHosts: usableHostsCount,
      unusedHosts: unusedHosts >= 0 ? unusedHosts : 0
    };
  }, [hostsNeeded]);

  // --- Tab 2: Reverse Lookup ---
  const [reverseIp, setReverseIp] = useState('192.168.10.45');
  const [reverseCidr, setReverseCidr] = useState<number>(24);

  const isReverseIpValid = useMemo(() => validateIp(reverseIp), [reverseIp]);

  const reverseLookupResults = useMemo(() => {
    if (!isReverseIpValid) return null;
    try {
      return calculateSubnetDetails(reverseIp, reverseCidr);
    } catch (e) {
      return null;
    }
  }, [reverseIp, reverseCidr, isReverseIpValid]);

  // --- Tab 3: Decimal-Binary-Hex-Octal Converter ---
  const [decInput, setDecInput] = useState('168');
  const [binInput, setBinInput] = useState('10101000');
  const [hexInput, setHexInput] = useState('A8');
  const [octInput, setOctInput] = useState('250');

  const handleBaseConvert = (val: string, base: 'dec' | 'bin' | 'hex' | 'oct') => {
    try {
      let decimalValue = 0;
      if (base === 'dec') {
        setDecInput(val);
        const parsed = parseInt(val, 10);
        if (isNaN(parsed)) return;
        decimalValue = parsed;
      } else if (base === 'bin') {
        setBinInput(val);
        const sanitized = val.replace(/[^01]/g, '');
        if (!sanitized) return;
        decimalValue = parseInt(sanitized, 2);
      } else if (base === 'hex') {
        setHexInput(val);
        const sanitized = val.replace(/[^0-9a-fA-F]/g, '');
        if (!sanitized) return;
        decimalValue = parseInt(sanitized, 16);
      } else {
        setOctInput(val);
        const sanitized = val.replace(/[^0-7]/g, '');
        if (!sanitized) return;
        decimalValue = parseInt(sanitized, 8);
      }

      if (decimalValue < 0 || decimalValue > 4294967295) return;

      if (base !== 'dec') setDecInput(decimalValue.toString(10));
      if (base !== 'bin') setBinInput(decimalValue.toString(2).padStart(8, '0'));
      if (base !== 'hex') setHexInput(decimalValue.toString(16).toUpperCase());
      if (base !== 'oct') setOctInput(decimalValue.toString(8));
    } catch (e) {
      // Ignore conversion parsing errors on mid-input keypresses
    }
  };

  // --- Tab 4: CIDR Cheat Sheet ---
  const [sheetSearch, setSheetSearch] = useState('');

  const cheatSheetRows = useMemo(() => {
    const rows = [];
    for (let c = 8; c <= 32; c++) {
      const total = Math.pow(2, 32 - c);
      let usable = 0;
      if (c === 32) usable = 1;
      else if (c === 31) usable = 2;
      else usable = total - 2;

      rows.push({
        cidr: c,
        mask: getMaskFromCidr(c),
        wildcard: getWildcardMask(c),
        total,
        usable
      });
    }
    return rows;
  }, []);

  const filteredSheetRows = useMemo(() => {
    if (!sheetSearch) return cheatSheetRows;
    const query = sheetSearch.trim().toLowerCase();
    return cheatSheetRows.filter(row => 
      row.cidr.toString().includes(query) || 
      row.mask.includes(query) ||
      row.wildcard.includes(query)
    );
  }, [cheatSheetRows, sheetSearch]);



  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Host Calculator */}
      <section className="glass-card p-5 border-slate-800/80 shadow-cyan-glow/5 relative flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 border-b border-slate-800/50 pb-3 mb-4">
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
              <Sliders size={16} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">Host Capacity Calculator</h3>
              <p className="text-[11px] text-slate-400">Determine the optimal CIDR block size given required hosts count.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Required Hosts Count</label>
              <input 
                type="number"
                min="1"
                value={hostsNeeded}
                onChange={(e) => setHostsNeeded(e.target.value)}
                placeholder="e.g. 50"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/60 text-slate-200 text-sm rounded-lg px-3.5 py-2 outline-none font-mono"
              />
            </div>

            {hostCalculatorResults && (
              <div className="bg-slate-950/40 border border-slate-900 rounded-lg p-4 space-y-3 font-mono text-xs">
                <div className="flex justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-slate-500">Best CIDR Mask:</span>
                  <span className="text-purple-400 font-bold">/{hostCalculatorResults.bestCidr}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-slate-500">Subnet Mask:</span>
                  <span className="text-slate-200 font-semibold">{hostCalculatorResults.subnetMask}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-slate-500">Total Available Hosts:</span>
                  <span className="text-slate-400">{hostCalculatorResults.availableHosts.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-slate-500">Usable Hosts:</span>
                  <span className="text-emerald-400 font-bold">{hostCalculatorResults.usableHosts.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Unused Hosts:</span>
                  <span className="text-amber-400 font-semibold">{hostCalculatorResults.unusedHosts.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="text-[10px] text-slate-500 mt-4 leading-normal flex items-start gap-1.5">
          <Info size={11} className="mt-0.5 shrink-0" />
          <span>Calculates 2^(32-c)-2 usable slots. Subtracts 2 addresses for standard subnet network and broadcast pointers.</span>
        </div>
      </section>

      {/* 2. Decimal-Binary-Hex-Octal Converter */}
      <section className="glass-card p-5 border-slate-800/80 shadow-cyan-glow/5 relative flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 border-b border-slate-800/50 pb-3 mb-4">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Binary size={16} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">Multi-Base Bit Converter</h3>
              <p className="text-[11px] text-slate-400">Convert numbers instantly between Decimal, Binary, Hex, and Octal radixes.</p>
            </div>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="grid grid-cols-4 gap-2 items-center">
              <span className="text-slate-400">Decimal:</span>
              <input 
                type="text" 
                value={decInput}
                onChange={(e) => handleBaseConvert(e.target.value, 'dec')}
                className="col-span-3 bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 text-slate-100 rounded px-2.5 py-1.5 outline-none font-bold"
              />
            </div>
            <div className="grid grid-cols-4 gap-2 items-center">
              <span className="text-slate-400">Binary:</span>
              <input 
                type="text" 
                value={binInput}
                onChange={(e) => handleBaseConvert(e.target.value, 'bin')}
                className="col-span-3 bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 text-emerald-400 rounded px-2.5 py-1.5 outline-none font-bold tracking-widest"
              />
            </div>
            <div className="grid grid-cols-4 gap-2 items-center">
              <span className="text-slate-400">Hex:</span>
              <input 
                type="text" 
                value={hexInput}
                onChange={(e) => handleBaseConvert(e.target.value, 'hex')}
                className="col-span-3 bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 text-purple-400 rounded px-2.5 py-1.5 outline-none font-bold uppercase"
              />
            </div>
            <div className="grid grid-cols-4 gap-2 items-center">
              <span className="text-slate-400">Octal:</span>
              <input 
                type="text" 
                value={octInput}
                onChange={(e) => handleBaseConvert(e.target.value, 'oct')}
                className="col-span-3 bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 text-slate-300 rounded px-2.5 py-1.5 outline-none font-bold"
              />
            </div>
          </div>
        </div>
        <div className="text-[10px] text-slate-500 mt-4 leading-normal flex items-start gap-1.5">
          <Info size={11} className="mt-0.5 shrink-0" />
          <span>Synchronizes base values instantly. Useful for mapping IP subnet octet transformations.</span>
        </div>
      </section>

      {/* 3. Reverse IP Lookup */}
      <section className="glass-card p-5 border-slate-800/80 shadow-cyan-glow/5 relative lg:col-span-2">
        <div className="flex items-center gap-2 border-b border-slate-800/50 pb-3 mb-4">
          <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
            <BookOpen size={16} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100">Reverse Subnet Lookup</h3>
            <p className="text-[11px] text-slate-400">Determine matching network details for any active host IP + mask.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end mb-4">
          <div className="md:col-span-6 space-y-2">
            <label className="text-[11px] font-semibold text-slate-400">Host IP Address</label>
            <input 
              type="text" 
              value={reverseIp}
              onChange={(e) => setReverseIp(e.target.value)}
              placeholder="e.g. 192.168.1.50"
              className={`w-full bg-slate-950/80 border text-slate-200 text-xs rounded-lg px-3 py-2 outline-none font-mono ${
                isReverseIpValid ? 'border-slate-850 focus:border-cyan-500/50' : 'border-red-950 focus:border-red-500'
              }`}
            />
          </div>

          <div className="md:col-span-6 space-y-2">
            <label className="text-[11px] font-semibold text-slate-400">Prefix Size</label>
            <select
              value={reverseCidr}
              onChange={(e) => setReverseCidr(parseInt(e.target.value, 10))}
              className="w-full bg-slate-950/80 border border-slate-850 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none font-mono focus:border-cyan-500/50"
            >
              {Array.from({ length: 32 }, (_, i) => i + 1).map(val => (
                <option key={val} value={val}>/{val} ({getMaskFromCidr(val)})</option>
              ))}
            </select>
          </div>
        </div>

        {reverseLookupResults && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 font-mono text-[11px] border border-slate-900 rounded-lg p-4 bg-slate-950/30">
            <div>
              <span className="block text-slate-500 uppercase text-[9px] font-bold">Network IP:</span>
              <span className="block font-bold text-slate-100 mt-1 select-all">{reverseLookupResults.networkAddress}</span>
            </div>
            <div>
              <span className="block text-slate-500 uppercase text-[9px] font-bold">Subnet Broadcast:</span>
              <span className="block font-bold text-slate-100 mt-1 select-all">{reverseLookupResults.broadcastAddress}</span>
            </div>
            <div>
              <span className="block text-slate-500 uppercase text-[9px] font-bold">Subnet Gateway:</span>
              <span className="block font-bold text-cyan-400 mt-1 select-all">{reverseLookupResults.firstUsableHost}</span>
            </div>
            <div>
              <span className="block text-slate-500 uppercase text-[9px] font-bold">Special RFC:</span>
              <span className="block font-bold text-purple-400 mt-1">{reverseLookupResults.rfcInfo || 'RFC 791 (Standard)'}</span>
            </div>
          </div>
        )}
      </section>

      {/* 4. CIDR Cheat Sheet */}
      <section className="glass-card p-5 border-slate-800/80 shadow-cyan-glow/5 relative lg:col-span-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/50 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-pink-500/10 text-pink-400 rounded-lg">
              <List size={16} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">CIDR & Mask Cheat Sheet</h3>
              <p className="text-[11px] text-slate-400">Complete prefix lengths lookup table from /8 to /32.</p>
            </div>
          </div>

          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-2 text-slate-500" />
            <input 
              type="text" 
              value={sheetSearch}
              onChange={(e) => setSheetSearch(e.target.value)}
              placeholder="Search prefix..."
              className="bg-slate-950/80 border border-slate-850 focus:border-cyan-500/40 text-slate-300 text-xs rounded-lg pl-7 pr-3 py-1 outline-none font-mono w-44"
            />
          </div>
        </div>

        <div className="overflow-y-auto max-h-56 pr-1 border border-slate-900 rounded-lg">
          <table className="w-full text-left font-mono text-[11px] text-slate-300 border-collapse">
            <thead className="bg-slate-950/60 sticky top-0 border-b border-slate-900 text-slate-400">
              <tr>
                <th className="p-2 bg-slate-950/80">Prefix</th>
                <th className="p-2 bg-slate-950/80">Subnet Mask</th>
                <th className="p-2 bg-slate-950/80">Wildcard Mask</th>
                <th className="p-2 bg-slate-950/80 text-right">Total Addresses</th>
                <th className="p-2 bg-slate-950/80 text-right">Usable Hosts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/50">
              {filteredSheetRows.map(row => (
                <tr key={row.cidr} className="hover:bg-slate-900/30">
                  <td className="p-2 font-bold text-purple-400">/{row.cidr}</td>
                  <td className="p-2 text-slate-200 font-bold select-all">{row.mask}</td>
                  <td className="p-2 text-slate-400 font-medium select-all">{row.wildcard}</td>
                  <td className="p-2 text-right text-slate-400">{row.total.toLocaleString()}</td>
                  <td className="p-2 text-right text-emerald-400 font-bold">{row.usable.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
