import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Icon } from './components/Icon';
import { Toolbar } from './components/Toolbar';
import { DEFAULT_SETTINGS } from './lib/defaults';
import { exportPaperAsPng, normalizePressure, renderInk, type CanvasSize } from './lib/drawing';
import { loadDocument, saveDocument } from './lib/storage';
import type { InkPoint, InkStroke, PaperStyle, PenLabSettings, Tool } from './lib/types';

const PRESSURE_HISTORY_LENGTH = 28;

type SaveState = 'loading' | 'saving' | 'saved' | 'error';

type PointerLabel = 'قلم دیجیتال' | 'لمس' | 'ماوس' | 'نامشخص';

function pointerLabel(pointerType: string): PointerLabel {
  if (pointerType === 'pen') return 'قلم دیجیتال';
  if (pointerType === 'touch') return 'لمس';
  if (pointerType === 'mouse') return 'ماوس';
  return 'نامشخص';
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `stroke-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function pointFromEvent(event: PointerEvent, canvas: HTMLCanvasElement, startedAt: number): InkPoint {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    pressure: normalizePressure(event.pressure),
    t: Math.max(0, Math.round(performance.now() - startedAt)),
    tiltX: event.tiltX,
    tiltY: event.tiltY,
  };
}

function App() {
  const [strokes, setStrokes] = useState<InkStroke[]>([]);
  const [settings, setSettings] = useState<PenLabSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('loading');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pressure, setPressure] = useState(0);
  const [pressureTrail, setPressureTrail] = useState<number[]>([]);
  const [lastPointer, setLastPointer] = useState<PointerLabel>('نامشخص');
  const [lastPointCount, setLastPointCount] = useState(0);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<InkStroke[]>([]);
  const activeStrokeRef = useRef<InkStroke | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const strokeStartedAtRef = useRef(0);
  const sizeRef = useRef<CanvasSize>({ width: 0, height: 0, dpr: 1 });
  const rafRef = useRef<number | null>(null);
  const pastRef = useRef<InkStroke[][]>([]);
  const futureRef = useRef<InkStroke[][]>([]);
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const updateStrokes = useCallback((next: InkStroke[]) => {
    strokesRef.current = next;
    setStrokes(next);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderInk(canvas, strokesRef.current, activeStrokeRef.current, sizeRef.current);
  }, []);

  const scheduleDraw = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      draw();
    });
  }, [draw]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await loadDocument();
      if (cancelled) return;
      if (stored?.schemaVersion === 1) {
        const loadedStrokes = Array.isArray(stored.strokes) ? stored.strokes : [];
        const loadedSettings = stored.settings && typeof stored.settings === 'object'
          ? { ...DEFAULT_SETTINGS, ...stored.settings }
          : DEFAULT_SETTINGS;
        strokesRef.current = loadedStrokes;
        setStrokes(loadedStrokes);
        settingsRef.current = loadedSettings;
        setSettings(loadedSettings);
        setSavedAt(stored.updatedAt || null);
      }
      setReady(true);
      setSaveState('saved');
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    setSaveState('saving');
    const timeout = window.setTimeout(() => {
      const updatedAt = Date.now();
      void saveDocument({
        schemaVersion: 1,
        updatedAt,
        strokes,
        settings,
      }).then(() => {
        setSavedAt(updatedAt);
        setSaveState('saved');
      }).catch((error: unknown) => {
        console.error(error);
        setSaveState('error');
      });
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [strokes, settings, ready]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      sizeRef.current = { width: rect.width, height: rect.height, dpr };
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      scheduleDraw();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    return () => observer.disconnect();
  }, [scheduleDraw]);

  useEffect(() => {
    scheduleDraw();
  }, [strokes, scheduleDraw]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleInstall = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleInstall);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleInstall);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isUndo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey;
      const isRedo = (event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey));
      if (isUndo) {
        event.preventDefault();
        undo();
      } else if (isRedo) {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // The handlers read mutable refs and do not need to be re-created.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  function pushHistory(): void {
    pastRef.current = [...pastRef.current.slice(-79), strokesRef.current];
    futureRef.current = [];
  }

  function undo(): void {
    if (pastRef.current.length === 0) return;
    futureRef.current = [...futureRef.current, strokesRef.current];
    const previous = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    updateStrokes(previous ?? []);
  }

  function redo(): void {
    if (futureRef.current.length === 0) return;
    pastRef.current = [...pastRef.current, strokesRef.current];
    const next = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    updateStrokes(next ?? []);
  }

  function beginStroke(event: ReactPointerEvent<HTMLCanvasElement>): void {
    const nativeEvent = event.nativeEvent;
    if (activePointerRef.current !== null || !nativeEvent.isPrimary || nativeEvent.button !== 0) return;
    if (nativeEvent.pointerType === 'touch' && !settingsRef.current.allowTouch) return;

    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    activePointerRef.current = nativeEvent.pointerId;
    strokeStartedAtRef.current = performance.now();

    const currentSettings = settingsRef.current;
    const firstPoint = pointFromEvent(nativeEvent, canvas, strokeStartedAtRef.current);
    activeStrokeRef.current = {
      id: createId(),
      tool: currentSettings.tool,
      color: currentSettings.color,
      width: currentSettings.width,
      pressureSensitive: currentSettings.pressureSensitive,
      pointerType: nativeEvent.pointerType,
      points: [firstPoint],
    };

    setLastPointer(pointerLabel(nativeEvent.pointerType));
    setLastPointCount(1);
    setPressure(firstPoint.pressure);
    setPressureTrail((previous) => [...previous.slice(-(PRESSURE_HISTORY_LENGTH - 1)), firstPoint.pressure]);
    try {
      canvas.setPointerCapture(nativeEvent.pointerId);
    } catch {
      // Pointer capture is not available in a few embedded browser contexts.
    }
    scheduleDraw();
  }

  function moveStroke(event: ReactPointerEvent<HTMLCanvasElement>): void {
    if (activePointerRef.current !== event.pointerId || !activeStrokeRef.current) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const nativeEvent = event.nativeEvent;
    const coalesced = typeof nativeEvent.getCoalescedEvents === 'function'
      ? nativeEvent.getCoalescedEvents()
      : [];
    const samples = coalesced.length > 0 ? coalesced : [nativeEvent];
    const active = activeStrokeRef.current;

    for (const sample of samples) {
      const nextPoint = pointFromEvent(sample, canvas, strokeStartedAtRef.current);
      const previous = active.points[active.points.length - 1];
      if (previous && Math.hypot(nextPoint.x - previous.x, nextPoint.y - previous.y) < 0.00008) {
        previous.pressure = nextPoint.pressure;
        continue;
      }
      active.points.push(nextPoint);
    }

    const latest = active.points[active.points.length - 1];
    if (latest) {
      setPressure(latest.pressure);
      setPressureTrail((previous) => [...previous.slice(-(PRESSURE_HISTORY_LENGTH - 1)), latest.pressure]);
    }
    setLastPointCount(active.points.length);
    scheduleDraw();
  }

  function finishStroke(event: ReactPointerEvent<HTMLCanvasElement>): void {
    if (activePointerRef.current !== event.pointerId) return;
    const canvas = canvasRef.current;
    const active = activeStrokeRef.current;
    activePointerRef.current = null;
    activeStrokeRef.current = null;

    if (active && active.points.length > 0) {
      pushHistory();
      updateStrokes([...strokesRef.current, active]);
      setLastPointCount(active.points.length);
    }

    if (canvas) {
      try {
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore browsers that do not implement pointer capture completely.
      }
    }
    scheduleDraw();
  }

  function cancelStroke(event: ReactPointerEvent<HTMLCanvasElement>): void {
    if (activePointerRef.current !== event.pointerId) return;
    activePointerRef.current = null;
    activeStrokeRef.current = null;
    scheduleDraw();
  }

  function changeSetting<K extends keyof PenLabSettings>(key: K, value: PenLabSettings[K]): void {
    setSettings((previous) => ({ ...previous, [key]: value }));
  }

  function clearPage(): void {
    if (strokesRef.current.length === 0) return;
    const accepted = window.confirm('تمام نوشته‌های این صفحه پاک شوند؟ امکان بازگردانی با واگرد وجود دارد.');
    if (!accepted) return;
    pushHistory();
    updateStrokes([]);
    activeStrokeRef.current = null;
    scheduleDraw();
  }

  function exportPage(): void {
    try {
      exportPaperAsPng(strokesRef.current, settingsRef.current.paperStyle);
    } catch (error) {
      console.error(error);
      window.alert('ساخت فایل خروجی انجام نشد. دوباره تلاش کن.');
    }
  }

  async function installApp(): Promise<void> {
    if (!installPrompt) {
      window.alert('برای نصب در اندروید، منوی مرورگر را باز کن و گزینهٔ «افزودن به صفحه اصلی» یا «Install app» را انتخاب کن.');
      return;
    }
    setIsInstalling(true);
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } finally {
      setInstallPrompt(null);
      setIsInstalling(false);
    }
  }

  const saveLabel = saveState === 'loading'
    ? 'در حال بارگذاری'
    : saveState === 'saving'
      ? 'در حال ذخیره'
      : saveState === 'error'
        ? 'خطا در ذخیره'
        : 'ذخیره شد';

  const saveTime = savedAt
    ? new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(savedAt)
    : null;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <div className="brand-mark"><Icon name="pen" size={22} /></div>
          <div className="brand-text">
            <div className="brand-name">StudyFlow <span>استادی فلو</span></div>
            <div className="brand-subtitle">فضای شخصی مطالعه و یادداشت‌برداری</div>
          </div>
        </div>

        <div className="header-context">
          <div className="breadcrumb"><span>دفترهای من</span><b>/</b><strong>آزمایشگاه قلم</strong></div>
          <span className="workspace-pill"><i /> محیط آزمایشی</span>
        </div>

        <div className="header-statuses">
          <div className={`status-chip ${saveState === 'error' ? 'status-error' : ''}`} title={saveTime ? `آخرین ذخیره: ${saveTime}` : saveLabel}>
            {saveState === 'saved' ? <Icon name="check" size={14} /> : <Icon name="save" size={14} />}
            <span>{saveLabel}</span>
            {saveState === 'saved' && saveTime ? <small>{saveTime}</small> : null}
          </div>
          <div className={`connection-dot ${isOnline ? 'is-online' : 'is-offline'}`} title={isOnline ? 'اتصال اینترنت برقرار است' : 'آفلاین'}>
            <span />{isOnline ? 'آنلاین' : 'آفلاین'}
          </div>
          <button className="header-action" onClick={installApp} disabled={isInstalling} title="نصب روی دستگاه">
            <Icon name="install" size={16} /><span>{isInstalling ? 'در حال نصب' : 'نصب اپ'}</span>
          </button>
        </div>
      </header>

      <section className="workspace-intro">
        <div className="intro-copy">
          <span className="eyebrow">YOUR WRITING SPACE</span>
          <h1>ایده‌هایت را روی کاغذ بیاور.</h1>
          <p>با قلم بنویس، فشار را کنترل کن و همه‌چیز را همان‌جا ذخیره کن.</p>
        </div>
        <div className="intro-meta">
          <div className="meta-item"><span>نوع صفحه</span><strong>دفتر A4</strong></div>
          <div className="meta-separator" />
          <div className="meta-item"><span>ورودی ترجیحی</span><strong><i className="tiny-pen-dot" /> S Pen</strong></div>
        </div>
      </section>

      <Toolbar
        tool={settings.tool}
        setTool={(value: Tool) => changeSetting('tool', value)}
        color={settings.color}
        setColor={(value) => changeSetting('color', value)}
        width={settings.width}
        setWidth={(value) => changeSetting('width', value)}
        pressureSensitive={settings.pressureSensitive}
        setPressureSensitive={(value) => changeSetting('pressureSensitive', value)}
        allowTouch={settings.allowTouch}
        setAllowTouch={(value) => changeSetting('allowTouch', value)}
        paperStyle={settings.paperStyle}
        setPaperStyle={(value: PaperStyle) => changeSetting('paperStyle', value)}
        onUndo={undo}
        onRedo={redo}
        onExport={exportPage}
        canUndo={pastRef.current.length > 0}
        canRedo={futureRef.current.length > 0}
      />

      <main className="main-layout">
        <section className="paper-area" aria-label="صفحه نوشتن">
          <div className="paper-toolbar-line">
            <div className="paper-heading">
              <span className="live-indicator" />
              <div className="paper-heading-copy">
                <strong>صفحه یادداشت</strong>
                <span className="paper-description">برای شروع، با S Pen روی کاغذ بنویس</span>
              </div>
            </div>
            <div className="paper-tools">
              <span className="stroke-count">{strokes.length.toLocaleString('fa-IR')} حرکت ثبت‌شده</span>
              <button className="text-action danger-action" onClick={clearPage} disabled={strokes.length === 0}>
                <Icon name="trash" size={15} /> پاک کردن صفحه
              </button>
            </div>
          </div>

          <div className="paper-stage">
            <div className="stage-label stage-label-top"><span>STUDYFLOW / NOTEBOOK</span><b>۱ از ۱</b></div>
            <div className={`paper-sheet paper-${settings.paperStyle} ${strokes.length > 0 ? 'has-ink' : ''}`}>
              <div className="paper-meta"><span>STUDYFLOW</span><span>MY NOTES · 01</span></div>
              <div className="paper-help" aria-hidden="true">
                <div className="paper-help-icon"><Icon name="spark" size={25} /></div>
                <strong>اینجا بنویس…</strong>
                <span>قلم را روی صفحه بگذار و نوشتن را شروع کن</span>
                <small>لمس دست در حالت پیش‌فرض غیرفعال است</small>
              </div>
              <canvas
                ref={canvasRef}
                className="ink-canvas"
                aria-label="سطح نوشتن آزمایشگاه قلم"
                onPointerDown={beginStroke}
                onPointerMove={moveStroke}
                onPointerUp={finishStroke}
                onPointerCancel={cancelStroke}
                onContextMenu={(event) => event.preventDefault()}
              />
              <div className="paper-footer"><span>StudyFlow · Personal notebook</span><span>{strokes.reduce((total, stroke) => total + stroke.points.length, 0).toLocaleString('fa-IR')} نقطه</span></div>
            </div>
            <div className="stage-label stage-label-bottom"><span>ذخیره خودکار روشن است</span><span>برای واگرد: Ctrl + Z</span></div>
          </div>
        </section>

        <aside className="inspector" aria-label="اطلاعات قلم">
          <section className="inspector-card pressure-card">
            <div className="card-heading">
              <div><span className="card-kicker">LIVE INPUT</span><h2>فشار لحظه‌ای قلم</h2></div>
              <div className="pressure-icon"><Icon name="pressure" size={19} /></div>
            </div>
            <div className="pressure-reading">
              <strong>{Math.round(pressure * 100).toLocaleString('fa-IR')}</strong><span>٪</span>
              <em>{pressure > 0 ? 'در حال دریافت' : 'منتظر ورودی'}</em>
            </div>
            <div className="pressure-track"><span style={{ width: `${Math.max(0, Math.min(100, pressure * 100))}%` }} /></div>
            <div className="pressure-chart" aria-label="تاریخچه فشار قلم">
              {pressureTrail.map((value, index) => <span key={`${index}-${value}`} style={{ height: `${Math.max(5, value * 100)}%` }} />)}
            </div>
            <div className="range-labels"><span>فشار کم</span><span>فشار زیاد</span></div>
          </section>

          <section className="inspector-card input-card">
            <div className="card-heading"><div><span className="card-kicker">DEVICE STATUS</span><h2>وضعیت ورودی</h2></div><span className="device-live"><i /> LIVE</span></div>
            <div className="device-row">
              <div className={`device-symbol ${lastPointer === 'قلم دیجیتال' ? 'device-pen' : ''}`}><Icon name={lastPointer === 'لمس' ? 'touch' : 'pen'} size={18} /></div>
              <div><strong>{lastPointer}</strong><span>{lastPointer === 'قلم دیجیتال' ? 'قلم دیجیتال شناسایی شد' : lastPointer === 'لمس' ? 'ورودی لمسی' : lastPointer === 'ماوس' ? 'ورودی ماوس' : 'برای شروع، قلم را روی صفحه بگذار'}</span></div>
              <span className={`device-state ${lastPointer === 'قلم دیجیتال' ? 'state-good' : ''}`}>{lastPointer === 'قلم دیجیتال' ? 'متصل' : 'آماده'}</span>
            </div>
            <div className="stats-grid">
              <div><span>نقاط آخرین حرکت</span><strong>{lastPointCount.toLocaleString('fa-IR')}</strong></div>
              <div><span>حرکت‌های ثبت‌شده</span><strong>{strokes.length.toLocaleString('fa-IR')}</strong></div>
            </div>
          </section>

          <section className="inspector-card guidance-card">
            <div className="guidance-icon"><Icon name="info" size={18} /></div>
            <div><h2>راهنمای نوشتن</h2>
              <p>برای کنترل ضخامت خط، با فشار کم شروع کن و به‌آرامی فشار را بیشتر کن. حساسیت فشار از نوار ابزار قابل خاموش‌کردن است.</p>
              <p>برای جلوگیری از خط ناخواسته، لمس دست به‌صورت پیش‌فرض نادیده گرفته می‌شود.</p>
            </div>
          </section>

          <div className="storage-note">
            <Icon name="save" size={15} />
            <span>یادداشت‌ها فعلاً روی همین دستگاه ذخیره می‌شوند؛ همگام‌سازی ابری در مرحله بعد اضافه خواهد شد.</span>
          </div>
        </aside>
      </main>

      <footer className="app-footer">
        <span>StudyFlow <b>0.2.0</b></span>
        <span>فضای نوشتن شخصی <i /> ذخیره خودکار محلی</span>
      </footer>
    </div>
  );
}

export default App;
