import { Cpu, MemoryStick, HardDrive, Monitor, AppWindow, Microchip, BatteryMedium, Palette, ListChecks } from 'lucide-react';
import { SectionHeading } from './PdpBlocks';

// Specifications of the selected configuration, as a two-column table.
const ROWS = [
    ['processor', 'Processor', Cpu],
    ['ram', 'RAM', MemoryStick],
    ['storage', 'Storage', HardDrive],
    ['display', 'Display', Monitor],
    ['os', 'Operating System', AppWindow],
    ['gpu', 'Graphics', Microchip],
    ['battery', 'Battery', BatteryMedium],
    ['color', 'Colour', Palette],
];

const valid = (v) => v != null && String(v).trim() && !['/', 'N/A', 'NA'].includes(String(v).trim());

export default function KeySpecs({ specs }) {
    const rows = ROWS.filter(([k]) => valid(specs?.[k]));
    if (!rows.length) return null;
    return (
        <section id="specs" aria-labelledby="specs-heading" className="min-w-0 flex-[1_1_440px] scroll-mt-24 rounded-[18px] border border-[#DDEFE3] bg-white px-[22px] py-5 shadow-[0_10px_30px_-12px_rgba(27,94,59,0.18),0_1px_3px_rgba(10,31,20,0.05)]">
            <SectionHeading id="specs-heading" icon={ListChecks} className="mb-3">Specifications</SectionHeading>
            <dl className="grid grid-cols-[minmax(120px,0.8fr)_2fr] text-sm">
                {rows.map(([key, label, Icon]) => (
                    <div key={key} className="contents">
                        <dt className="flex items-center gap-2 border-t border-[#EEF3F0] bg-[#F7FAF8] px-3 py-2.5 text-gray-500">
                            <Icon aria-hidden="true" className="h-4 w-4 text-[#1B5E3B]" strokeWidth={1.75} />{label}
                        </dt>
                        <dd className="break-words border-t border-[#EEF3F0] px-3 py-2.5 text-[#0B2136]">{String(specs[key])}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}
