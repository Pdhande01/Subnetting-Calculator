import React from 'react';
import { BookOpen, HelpCircle, Layers, ShieldCheck, Compass } from 'lucide-react';

export const GuideTab: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Educational Articles */}
      <section className="glass-card p-6 border-slate-800/80 relative overflow-hidden print-block">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        <div className="flex items-center gap-2 border-b border-slate-800/50 pb-4 mb-6">
          <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
            <Compass size={20} />
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-100 print-text">Subnetting Educational Guide</h2>
            <p className="text-xs text-slate-400">Master IP address subnetting, CIDR prefix calculations, and classless routing structures.</p>
          </div>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm leading-relaxed text-slate-300 font-sans">
          
          {/* Article 1: What is Subnetting */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold border-b border-slate-900 pb-2">
              <BookOpen size={16} />
              <h4>What is Subnetting?</h4>
            </div>
            <p>
              Subnetting is the practice of dividing a physical network into two or more smaller, logical sub-networks (subnets). 
              By segmenting a massive IP range, networks achieve:
            </p>
            <ul className="list-disc list-inside pl-2 space-y-1 text-xs text-slate-400">
              <li><strong className="text-slate-300">Security:</strong> Isolating sensitive departments (e.g. Finance vs Wi-Fi guest) preventing direct routing.</li>
              <li><strong className="text-slate-300">Traffic Management:</strong> Reducing broadcast storm traffic since broadcasts are isolated within subnets.</li>
              <li><strong className="text-slate-300">Organization:</strong> Allocating clear blocks of addresses to physical locations or virtual VLAN groups.</li>
            </ul>
            <p className="text-xs">
              Every IP address is divided into a <strong className="text-cyan-400 font-normal">Network Portion</strong> (identifying which sub-network the device belongs to) and a <strong className="text-purple-400 font-normal">Host Portion</strong> (identifying the specific device interface on that network).
            </p>
          </div>

          {/* Article 2: CIDR Blocks */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold border-b border-slate-900 pb-2">
              <Layers size={16} />
              <h4>What is CIDR Notation?</h4>
            </div>
            <p>
              Originally, IP addresses were split into Class A, B, and C pools, which was highly wasteful. 
              <strong className="text-slate-200">CIDR (Classless Inter-Domain Routing)</strong> was introduced in 1993 to replace this system.
            </p>
            <p>
              Instead of using rigid 8-bit octet boundaries, CIDR specifies the exact number of bits reserved for the network ID using a slash notation (e.g. <code className="font-mono text-purple-400 font-bold bg-slate-950 px-1 py-0.5 rounded">/24</code>).
            </p>
            <p className="text-xs">
              For example, in a <code className="font-mono bg-slate-950 px-1 py-0.5 rounded">/24</code> subnet mask, the first 24 bits of the 32-bit address are set to 1s (<code className="font-mono text-emerald-400">255.255.255.0</code>). 
              The remaining 8 bits (<code className="font-mono">32 - 24 = 8</code>) are host bits, yielding <code className="font-mono">2^8 = 256</code> total addresses.
            </p>
          </div>

          {/* Article 3: Network & Broadcast IP */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold border-b border-slate-900 pb-2">
              <ShieldCheck size={16} />
              <h4>Network ID vs. Broadcast Address</h4>
            </div>
            <p>
              Inside standard IPv4 subnets, two addresses are reserved for network system flags:
            </p>
            <ul className="list-disc list-inside pl-2 space-y-1.5 text-xs text-slate-400">
              <li>
                <strong className="text-slate-300">Network Address (ID):</strong> The first address in the block (all host bits set to 0). It identifies the subnet itself in routing tables. 
                <span className="block pl-5 mt-0.5 text-slate-500 font-mono">Example: 192.168.1.0</span>
              </li>
              <li>
                <strong className="text-slate-300">Broadcast Address:</strong> The final address in the block (all host bits set to 1). A packet sent to this IP is received by every host on the subnet.
                <span className="block pl-5 mt-0.5 text-slate-500 font-mono">Example: 192.168.1.255</span>
              </li>
            </ul>
            <p className="text-xs">
              Because these two addresses are reserved, the number of <strong className="text-slate-250 font-normal">usable host slots</strong> is always calculated as <code className="font-mono text-emerald-400">2^(Host Bits) - 2</code>.
            </p>
          </div>

          {/* Article 4: Wildcard Mask */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold border-b border-slate-900 pb-2">
              <HelpCircle size={16} />
              <h4>What is a Wildcard Mask?</h4>
            </div>
            <p>
              A wildcard mask is a set of bits that determines which parts of an IP address can vary. 
              It is calculated as the bitwise NOT (the exact inverse) of the Subnet Mask.
            </p>
            <p>
              If a subnet mask is <code className="font-mono bg-slate-950 px-1 py-0.5 rounded">255.255.255.0</code>, the wildcard mask is:
              <code className="block font-mono text-purple-400 bg-slate-950 p-2 rounded text-center mt-1.5 font-bold">255.255.255.255 - 255.255.255.0 = 0.0.0.255</code>
            </p>
            <p className="text-xs">
              Wildcards are extensively used in network security filters like router **Access Control Lists (ACLs)** and routing protocols (OSPF) to define matches for IP addresses.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison: FLSM vs VLSM */}
      <section className="glass-card p-6 border-slate-800/80 relative overflow-hidden print-block animate-fade-in">
        <div className="flex items-center gap-2 border-b border-slate-800/50 pb-4 mb-5">
          <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
            <Layers size={18} />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-100 print-text">FLSM vs VLSM Architectures</h3>
            <p className="text-xs text-slate-400">Comparing fixed-length segmenting against variable-length allocation systems.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-350">
          <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-900">
            <h4 className="font-bold text-cyan-400 mb-2 font-mono">FLSM (Fixed Length Subnet Masking)</h4>
            <p className="text-xs leading-relaxed">
              In FLSM, every subnet is sliced into the exact same size. 
              If you divide `192.168.1.0/24` using a prefix of `/26`, you get 4 equal subnets each supporting exactly 62 usable hosts.
            </p>
            <div className="mt-3.5 space-y-1.5 text-xs text-slate-500">
              <span className="block"><strong className="text-slate-350 font-normal">Pros:</strong> Extremely simple to design and track; consistent gateway structures.</span>
              <span className="block"><strong className="text-slate-350 font-normal">Cons:</strong> Highly wasteful if one network needs 50 hosts but another only needs 2 (both consume 64 slots).</span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-900">
            <h4 className="font-bold text-purple-400 mb-2 font-mono">VLSM (Variable Length Subnet Masking)</h4>
            <p className="text-xs leading-relaxed">
              VLSM allows administrators to customize subnet mask sizes for each individual segment. 
              A base network can be partitioned into a `/25` (126 hosts) for computers, a `/27` (30 hosts) for administration, and a `/30` (2 hosts) for router links.
            </p>
            <div className="mt-3.5 space-y-1.5 text-xs text-slate-500">
              <span className="block"><strong className="text-slate-350 font-normal">Pros:</strong> Maximum IP address optimization; handles various group sizes with no waste.</span>
              <span className="block"><strong className="text-slate-350 font-normal">Cons:</strong> Requires careful binary planning to avoid address segment overlaps.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Step by Step Math illustration */}
      <section className="glass-card p-6 border-slate-800/80 relative overflow-hidden print-block">
        <h3 className="font-bold text-base text-slate-100 border-b border-slate-800/50 pb-3 mb-4 print-text">Manual Subnet Calculation: Step-by-Step</h3>
        
        <div className="space-y-4 font-mono text-xs text-slate-300">
          <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-900 space-y-1 leading-normal">
            <span className="text-cyan-400 font-bold">Goal:</span>
            <p>Determine Network details for host address <strong>192.168.10.150 /26</strong>.</p>
          </div>

          <div className="space-y-3 pl-2.5 border-l border-slate-800">
            <div>
              <span className="text-purple-400 font-bold block">Step 1: Write down the Subnet Mask</span>
              <p className="text-slate-400 mt-0.5 text-[11px] leading-relaxed">
                /26 means 26 ones followed by 6 zeros in binary:<br/>
                <code>11111111.11111111.11111111.11000000 ➔ 255.255.255.192</code>
              </p>
            </div>
            <div>
              <span className="text-purple-400 font-bold block">Step 2: Find Block Size (Increment)</span>
              <p className="text-slate-400 mt-0.5 text-[11px] leading-relaxed">
                Subtract the active octet value from 256:<br/>
                <code>256 - 192 = 64</code>. Subnets will increase in steps of 64: 0, 64, 128, 192.
              </p>
            </div>
            <div>
              <span className="text-purple-400 font-bold block">Step 3: Locate host block range</span>
              <p className="text-slate-400 mt-0.5 text-[11px] leading-relaxed">
                The host octet is 150. Since 150 falls between 128 and 192:<br/>
                - Network ID: <code>192.168.10.128</code><br/>
                - Next Network ID: <code>192.168.10.192</code> (so Broadcast ID is <code>192.168.10.191</code>)<br/>
                - Usable Host Range: <code>192.168.10.129</code> to <code>192.168.10.190</code>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
