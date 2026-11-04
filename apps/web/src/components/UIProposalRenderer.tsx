import React, { useId, useState } from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { StructuredUISpec, UIComponentSpec } from '../types';

const shell = 'border border-[#DDE1DB] bg-white text-[#151923]';

const NodeView: React.FC<{ node: UIComponentSpec; compact: boolean; columns: number; depth: number }> = ({ node, compact, columns, depth }) => {
  const { t } = useLanguage();
  const inputId = useId();
  const [pressed, setPressed] = useState(false);
  const [tab, setTab] = useState(0);
  if (depth > 6) return null;
  const children = (node.children || []).slice(0, 12);
  const renderChildren = () => children.map((child, index) => <NodeView key={index} node={child} compact={compact} columns={columns} depth={depth + 1} />);
  switch (node.type) {
    case 'Container': return <div className={!compact && node.layout_columns && node.layout_columns > 1 ? `grid gap-5 ${node.layout_columns > 2 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}` : 'space-y-5'} role={node.semantic_role === 'main' ? 'main' : undefined}>{renderChildren()}</div>;
    case 'Stack': return <div className="flex flex-col gap-4">{renderChildren()}</div>;
    case 'Grid': return <div className={`grid gap-4 ${!compact && (node.layout_columns || columns) > 1 ? 'sm:grid-cols-2' : ''} ${!compact && (node.layout_columns || columns) > 2 ? 'lg:grid-cols-3' : ''}`}>{renderChildren()}</div>;
    case 'Card': return <div className={`${shell} rounded-2xl p-5 shadow-[0_8px_30px_rgba(21,25,35,0.06)] space-y-4`}>{renderChildren()}</div>;
    case 'Form': return <form className={!compact && node.layout_columns && node.layout_columns > 1 ? `grid gap-4 ${node.layout_columns > 2 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}` : 'space-y-4'} onSubmit={(event) => event.preventDefault()}>{renderChildren()}</form>;
    case 'Heading': return <h2 className="text-2xl font-bold tracking-tight">{node.text || node.label}</h2>;
    case 'Text': return <p className="text-sm leading-6 text-[#56606E]">{node.text || node.label}</p>;
    case 'Input': return <div className="space-y-2"><label className="block text-xs font-semibold" htmlFor={inputId}>{node.label}</label><input id={inputId} type="text" placeholder={node.placeholder || undefined} autoComplete="off" className="w-full rounded-xl border border-[#DDE1DB] px-3 py-2.5 text-sm outline-none focus:border-[#526BEE] focus:ring-2 focus:ring-[#526BEE]/20" /></div>;
    case 'Button': {
      const variant = node.button_variant === 'red' ? 'bg-[#DC2626] text-white hover:bg-[#B91C1C]' : node.button_variant === 'dark_red' ? 'bg-[#991B1B] text-white hover:bg-[#7F1D1D]' : node.button_variant === 'ink' ? 'bg-[#151923] text-white hover:bg-[#303744]' : 'bg-[#C7F36B] text-[#151923] hover:bg-[#B8E65A]';
      const shape = node.button_shape === 'square' ? 'rounded-none' : 'rounded-xl';
      return <button type="button" aria-pressed={node.interaction === 'local_toggle' ? pressed : undefined} onClick={node.interaction === 'local_toggle' ? () => setPressed((value) => !value) : undefined} className={`${shape} ${variant} inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#526BEE] ${pressed ? 'ring-2 ring-[#151923] ring-offset-2' : ''}`}>{node.button_icon === 'plus' && <Plus className="h-4 w-4" aria-hidden="true" />}{node.button_icon === 'arrow_right' && <ArrowRight className="h-4 w-4" aria-hidden="true" />}{node.text || node.label}</button>;
    }
    case 'ImagePlaceholder': return <div role="img" aria-label={node.label || ''} className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-[#C8CEC5] bg-[#F7F8F5] p-4 text-center text-xs text-[#697380]">{node.label}</div>;
    case 'Divider': return <hr className="border-[#DDE1DB]" />;
    case 'Tabs': return <div><div role="tablist" className="mb-4 flex gap-2 border-b border-[#DDE1DB]">{children.map((child, index) => <button key={index} type="button" role="tab" aria-selected={tab === index} onClick={() => setTab(index)} className={`border-b-2 px-3 py-2 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#526BEE] ${tab === index ? 'border-[#526BEE]' : 'border-transparent'}`}>{child.label || child.text || `${t('proposal.tab')} ${index + 1}`}</button>)}</div>{children[tab] && <div role="tabpanel"><NodeView node={children[tab]} compact={compact} columns={columns} depth={depth + 1} /></div>}</div>;
    default: return <div role="status" className="rounded-lg border border-amber-300 p-3 text-xs">{t('proposal.unsupported')}</div>;
  }
};

export const UIProposalRenderer: React.FC<{ spec: StructuredUISpec; viewport: 'desktop' | 'mobile' }> = ({ spec, viewport }) => {
  const compact = viewport === 'mobile';
  const columns = compact ? spec.responsive.mobile_columns : spec.responsive.desktop_columns;
  const tone = { neutral: 'bg-[#F7F8F5]', ink: 'bg-[#E9ECF0]', lime: 'bg-[#F1F8E4]' }[spec.design_tokens.tone] || 'bg-[#F7F8F5]';
  const spacing = { compact: 'p-4', comfortable: 'p-5', spacious: 'p-8' }[spec.design_tokens.spacing] || 'p-5';
  const radius = spec.design_tokens.radius === 'square' ? 'rounded-lg' : 'rounded-[28px]';
  const alignment = spec.design_tokens.alignment === 'center' ? 'text-center' : 'text-left';
  return <div className={`mx-auto min-h-[420px] w-full ${compact ? 'max-w-[390px]' : 'max-w-[920px]'} ${radius} ${tone} ${spacing} ${alignment} border border-[#DDE1DB] shadow-[0_20px_70px_rgba(21,25,35,0.1)] transition-[max-width] duration-300`}>
    <div className="mb-6 flex items-center gap-1.5 border-b border-[#DDE1DB] pb-4" aria-hidden="true"><span className="h-2 w-2 rounded-full bg-[#E5484D]" /><span className="h-2 w-2 rounded-full bg-[#F5A623]" /><span className="h-2 w-2 rounded-full bg-[#C7F36B]" /></div>
    <NodeView node={spec.root} compact={compact} columns={columns} depth={1} />
  </div>;
};
