import { useEffect, useRef } from 'react';
import { Garage, type Quality } from './Garage';
type Props = {
  selected: string | null; blocked: boolean; intro: boolean; reduced: boolean; quality: Quality; reset: number;
  onReady: () => void; onProgress: (value: number) => void; onError: () => void; onSelect: (id: string) => void;
  onHover: (id: string | null, x: number, y: number) => void; onIntroEnd: () => void; onQuality: (quality: 'high' | 'low') => void;
};
declare global { interface Window { __garage?: () => ReturnType<Garage['diagnostics']> } }
export default function Scene(props: Props) {
  const host = useRef<HTMLDivElement>(null); const engine = useRef<Garage | null>(null); const latest = useRef(props); latest.current = props;
  useEffect(() => {
    let garage: Garage;
    try {
      garage = new Garage(host.current!, {
        ...latest.current,
        onReady: () => latest.current.onReady(), onProgress: value => latest.current.onProgress(value), onError: () => latest.current.onError(),
        onSelect: id => latest.current.onSelect(id), onHover: (...args) => latest.current.onHover(...args),
        onIntroEnd: () => latest.current.onIntroEnd(), onQuality: q => latest.current.onQuality(q),
      });
      engine.current = garage;
      garage.select(latest.current.selected); garage.setBlocked(latest.current.blocked);
      if (new URLSearchParams(location.search).has('debug')) window.__garage = () => garage.diagnostics();
    } catch (error) { console.error('Garage initialization failed:', error); latest.current.onError(); }
    return () => { garage?.dispose(); engine.current = null; delete window.__garage; };
  }, []);
  useEffect(() => { engine.current?.select(props.selected); engine.current?.setBlocked(props.blocked); }, [props.selected, props.blocked]);
  useEffect(() => { if (!props.intro) engine.current?.skipIntro(); }, [props.intro]);
  useEffect(() => { engine.current?.setReduced(props.reduced); }, [props.reduced]);
  useEffect(() => { engine.current?.setQuality(props.quality); }, [props.quality]);
  useEffect(() => { if (props.reset) engine.current?.home(); }, [props.reset]);
  return <div ref={host} className="scene-canvas" data-testid="scene" />;
}
