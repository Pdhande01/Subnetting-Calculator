import React, { useState, useEffect } from 'react';
import { 
  getMaskFromCidr, 
  calculateSubnetDetails, 
  longToIp,
  ipToLong
} from '../utils/ipUtils';
import { 
  Trophy, 
  RotateCw, 
  Award, 
  CheckCircle, 
  XCircle, 
  Flame,
  HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PracticeTabProps {
  onNotify: (message: string, type: 'success' | 'info' | 'error') => void;
}

interface Question {
  type: 'mask' | 'broadcast' | 'network' | 'hosts';
  text: string;
  options: string[];
  answer: string;
  explanation: string;
}

export const PracticeTab: React.FC<PracticeTabProps> = ({ onNotify }) => {
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [quizType, setQuizType] = useState<'mixed' | 'mask' | 'broadcast' | 'network' | 'hosts'>('mixed');

  // Stats
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  // Generate a random IP Address
  const generateRandomIp = (): string => {
    const octet1 = Math.floor(Math.random() * 190) + 10; // Avoid class D/E or low numbers
    const octet2 = Math.floor(Math.random() * 254) + 1;
    const octet3 = Math.floor(Math.random() * 254) + 1;
    const octet4 = Math.floor(Math.random() * 254) + 1;
    return `${octet1}.${octet2}.${octet3}.${octet4}`;
  };

  // Generate a random CIDR between /8 and /30
  const generateRandomCidr = (): number => {
    return Math.floor(Math.random() * 22) + 8; // /8 to /29
  };

  // Generate next question
  const generateQuestion = () => {
    setSelectedAnswer(null);
    setIsAnswered(false);

    // Determine type
    let type: 'mask' | 'broadcast' | 'network' | 'hosts' = 'mask';
    if (quizType === 'mixed') {
      const types: ('mask' | 'broadcast' | 'network' | 'hosts')[] = ['mask', 'broadcast', 'network', 'hosts'];
      type = types[Math.floor(Math.random() * types.length)];
    } else {
      type = quizType;
    }

    const ip = generateRandomIp();
    const cidr = generateRandomCidr();
    const details = calculateSubnetDetails(ip, cidr);

    let qText = '';
    let correctAnswer = '';
    let distractors: string[] = [];
    let explanationText = '';

    if (type === 'mask') {
      qText = `What is the Subnet Mask for CIDR prefix /${cidr}?`;
      correctAnswer = details.subnetMask;
      
      // Generate distractors
      const offsets = [-2, -1, 1, 2];
      const masksSet = new Set<string>();
      while (masksSet.size < 3) {
        const randomCidr = Math.min(30, Math.max(8, cidr + offsets[Math.floor(Math.random() * offsets.length)]));
        if (randomCidr !== cidr) {
          masksSet.add(getMaskFromCidr(randomCidr));
        }
      }
      distractors = Array.from(masksSet);
      explanationText = `A prefix length of /${cidr} means that the first ${cidr} bits are set to 1 in the mask. In dotted-decimal format, this is ${details.subnetMask}.`;
    } 
    else if (type === 'broadcast') {
      qText = `Identify the Broadcast Address of host IP ${ip} with prefix /${cidr}:`;
      correctAnswer = details.broadcastAddress;

      // Distractors: network, network + something, random IPs
      const baseNet = ipToLong(details.networkAddress);
      const randomIp1 = longToIp((baseNet + Math.pow(2, 32 - cidr) - 2) >>> 0); // last host
      const randomIp2 = details.networkAddress; // network ID
      const randomIp3 = longToIp((ipToLong(ip) + 3) >>> 0);
      distractors = [randomIp1, randomIp2, randomIp3];
      explanationText = `For ${ip}/${cidr}, the network address is ${details.networkAddress}. The block contains ${details.totalHosts} total addresses, meaning the broadcast is ${details.broadcastAddress}.`;
    } 
    else if (type === 'network') {
      qText = `What is the Network Address (ID) for host ${ip}/${cidr}?`;
      correctAnswer = details.networkAddress;

      // Distractors: broadcast, gateway, next host
      const firstHost = details.firstUsableHost;
      const broadcast = details.broadcastAddress;
      const invalidNet = longToIp((ipToLong(details.networkAddress) + 32) >>> 0); // offset
      distractors = [firstHost, broadcast, invalidNet];
      explanationText = `Performing a bitwise AND between the IP ${ip} and Subnet Mask ${details.subnetMask} reveals the Network ID: ${details.networkAddress}.`;
    } 
    else {
      qText = `How many usable hosts are available on a /${cidr} subnet?`;
      correctAnswer = details.usableHosts.toLocaleString();

      // Distractors: total hosts, off by 2, other sizes
      const totalHosts = details.totalHosts;
      const totalDist = totalHosts.toLocaleString();
      const offByTwoDist = (totalHosts + 2).toLocaleString();
      const wrongSizeDist = (Math.pow(2, 32 - (cidr - 1)) - 2).toLocaleString();
      distractors = [totalDist, offByTwoDist, wrongSizeDist];
      explanationText = `A /${cidr} subnet contains 2^(32 - ${cidr}) = ${details.totalHosts} total addresses. We subtract 2 (for the Network ID and Broadcast IP), resulting in ${details.usableHosts} usable hosts.`;
    }

    // Combine options and shuffle
    const options = [correctAnswer, ...distractors]
      .filter((v, i, self) => self.indexOf(v) === i) // unique
      .sort(() => Math.random() - 0.5);

    // Make sure we have 4 options
    while (options.length < 4) {
      options.push(generateRandomIp());
    }

    setQuestion({
      type,
      text: qText,
      options: options.slice(0, 4),
      answer: correctAnswer,
      explanation: explanationText
    });
  };

  const handleAnswerSubmit = (option: string) => {
    if (isAnswered) return;
    setSelectedAnswer(option);
    setIsAnswered(true);
    setTotal(prev => prev + 1);

    if (option === question?.answer) {
      setScore(prev => prev + 1);
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak > bestStreak) {
        setBestStreak(nextStreak);
      }
      onNotify('Correct Answer! Nice job.', 'success');

      // Trigger Confetti!
      if (nextStreak % 5 === 0) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });
      }
    } else {
      setStreak(0);
      onNotify('Incorrect Answer. Read the explanation.', 'error');
    }
  };

  // Trigger first question
  useEffect(() => {
    generateQuestion();
  }, [quizType]);

  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Quiz Area */}
      <section className="glass-card p-6 border-slate-800/80 shadow-cyan-glow/5 relative lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800/50 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
              <HelpCircle size={18} />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-100">Practice Quiz Mode</h2>
              <p className="text-xs text-slate-400">Test your IP subnetting speed and accuracy.</p>
            </div>
          </div>

          {/* Quiz selection */}
          <select
            value={quizType}
            onChange={(e) => setQuizType(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 outline-none font-sans focus:border-cyan-500/50"
          >
            <option value="mixed">All Types Mixed</option>
            <option value="mask">CIDR ➔ Subnet Mask</option>
            <option value="broadcast">Find Broadcast Address</option>
            <option value="network">Identify Network ID</option>
            <option value="hosts">Calculate Usable Hosts</option>
          </select>
        </div>

        {question && (
          <div className="space-y-6">
            {/* Question Text */}
            <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Question Category: {question.type === 'mask' ? 'Mask Recognition' : question.type === 'broadcast' ? 'Broadcast Location' : question.type === 'network' ? 'Network ID Lookup' : 'Host Capacity Math'}
              </span>
              <p className="text-slate-100 font-semibold text-[15px] mt-1.5 leading-relaxed">
                {question.text}
              </p>
            </div>

            {/* Answer Selector Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {question.options.map((opt, i) => {
                let btnStyle = 'border-slate-800 bg-slate-900/40 text-slate-200 hover:border-cyan-500/30 hover:bg-slate-900/80';
                if (isAnswered) {
                  if (opt === question.answer) {
                    btnStyle = 'border-emerald-500 bg-emerald-950/20 text-emerald-400 font-bold';
                  } else if (opt === selectedAnswer) {
                    btnStyle = 'border-red-500 bg-red-950/20 text-red-400 font-bold';
                  } else {
                    btnStyle = 'border-slate-900 bg-slate-950/20 text-slate-600 opacity-60';
                  }
                }

                return (
                  <button
                    key={i}
                    disabled={isAnswered}
                    onClick={() => handleAnswerSubmit(opt)}
                    className={`p-4 rounded-xl border text-left font-mono text-sm transition-all duration-200 flex items-center justify-between active:scale-98 ${btnStyle}`}
                  >
                    <span>{opt}</span>
                    {isAnswered && opt === question.answer && (
                      <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                    )}
                    {isAnswered && opt === selectedAnswer && opt !== question.answer && (
                      <XCircle size={16} className="text-red-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation box */}
            {isAnswered && (
              <div className="p-4 bg-cyan-950/10 border border-cyan-900/35 rounded-xl space-y-2 animate-fade-in">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Calculation Explanation:</span>
                <p className="text-xs text-slate-300 leading-normal font-sans">
                  {question.explanation}
                </p>
                <div className="pt-2">
                  <button 
                    onClick={generateQuestion}
                    className="px-4 py-2 bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all"
                  >
                    <RotateCw size={12} />
                    Next Question
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Scorecards and Streaks */}
      <section className="space-y-6">
        {/* Scorecard */}
        <div className="glass-card p-5 border-slate-800/80 shadow-cyan-glow/5 relative text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Trophy className="text-amber-400" size={20} />
            <h3 className="font-bold text-slate-100 text-sm">Performance Scorecard</h3>
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-slate-800/50 pt-4">
            <div>
              <span className="block text-slate-500 text-[10px] font-bold uppercase">Accuracy</span>
              <span className="block font-mono font-bold text-lg text-cyan-400 mt-1">{accuracy}%</span>
            </div>
            <div>
              <span className="block text-slate-500 text-[10px] font-bold uppercase">Correct</span>
              <span className="block font-mono font-bold text-lg text-emerald-400 mt-1">{score}</span>
            </div>
            <div>
              <span className="block text-slate-500 text-[10px] font-bold uppercase">Total Qs</span>
              <span className="block font-mono font-bold text-lg text-slate-300 mt-1">{total}</span>
            </div>
          </div>
        </div>

        {/* Streak Meter */}
        <div className="glass-card p-5 border-slate-800/80 shadow-cyan-glow/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between border-b border-slate-800/50 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Flame className="text-orange-500 fill-orange-500 animate-pulse" size={20} />
              <h3 className="font-bold text-slate-100 text-sm">Streak Meter</h3>
            </div>
            <span className="text-[10px] font-semibold text-slate-500">Milestone: Confetti on every 5x streak!</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-lg">
              <span className="block text-[9px] text-slate-500 font-bold uppercase">Current Streak</span>
              <span className="block font-mono font-bold text-2xl text-orange-400 mt-1.5">{streak} 🔥</span>
            </div>
            <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-lg">
              <span className="block text-[9px] text-slate-500 font-bold uppercase">Best Streak</span>
              <span className="block font-mono font-bold text-2xl text-purple-400 mt-1.5">{bestStreak} 🏆</span>
            </div>
          </div>
        </div>

        {/* Instruction Info */}
        <div className="p-4 bg-slate-900/40 border border-slate-800/60 rounded-xl flex gap-3 text-xs leading-normal">
          <Award size={18} className="text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-slate-400">
            <h4 className="font-semibold text-slate-300">Networking Exam Prep</h4>
            <p className="mt-1 text-[11px]">
              Perfect for preparing for Cisco CCNA, CompTIA Network+, or security certifications. Practice mental math calculations for subnet masks, broadcast sizes, and IP ranges.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
