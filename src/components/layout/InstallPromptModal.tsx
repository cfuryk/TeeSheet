import { useState, useEffect } from 'react'

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const isIosSafari = () => isIos() && /safari/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent)
const isMobile = () => /iphone|ipad|ipod|android/i.test(navigator.userAgent)
const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true

function IosInstructions({ onClose }: { onClose: () => void }) {
    return (
        <>
            <p className="text-sm text-muted">Add this app to your home screen for the best experience:</p>
            <ol className="flex flex-col gap-3">
                <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span className="text-sm text-brand">Tap the <strong>Share</strong> button <span className="inline-block">⎋</span> at the bottom of the screen</span>
                </li>
                <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span className="text-sm text-brand">Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                </li>
                <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span className="text-sm text-brand">Tap <strong>"Add"</strong> in the top right</span>
                </li>
            </ol>
            <button onClick={onClose} className="mt-2 h-10 w-full rounded-xl bg-brand text-white text-sm font-semibold">
                Got it
            </button>
        </>
    )
}

function IosSafariNudge({ onClose }: { onClose: () => void }) {
    return (
        <>
            <p className="text-sm text-muted">To install this app, open this page in <strong>Safari</strong>.</p>
            <p className="text-xs text-muted">Chrome and Firefox on iOS cannot install apps. Copy the URL and paste it into Safari.</p>
            <button onClick={onClose} className="mt-2 h-10 w-full rounded-xl border border-card-border text-brand text-sm font-semibold">
                Dismiss
            </button>
        </>
    )
}

function AndroidInstructions({ onInstall, onClose }: { onInstall: () => void; onClose: () => void }) {
    return (
        <>
            <p className="text-sm text-muted">Install this app for the best experience.</p>
            <button onClick={onInstall} className="h-10 w-full rounded-xl bg-brand text-white text-sm font-semibold">
                Install App
            </button>
            <button onClick={onClose} className="h-10 w-full rounded-xl border border-card-border text-brand text-sm font-semibold">
                Maybe Later
            </button>
        </>
    )
}

export function InstallPromptModal() {
    const [show, setShow] = useState(false)
    const [installPrompt, setInstallPrompt] = useState<Event | null>(null)

    useEffect(() => {
        // Only show on mobile browsers, never in standalone mode
        if (!isMobile() || isStandalone()) return
        setShow(true)

        function handler(e: Event) {
            e.preventDefault()
            setInstallPrompt(e)
        }
        window.addEventListener('beforeinstallprompt', handler)
        window.addEventListener('appinstalled', () => { setInstallPrompt(null); setShow(false) })
        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    async function handleAndroidInstall() {
        if (!installPrompt) return
        await (installPrompt as any).prompt()
        setInstallPrompt(null)
        setShow(false)
    }

    if (!show) return null

    // iOS: distinguish Safari (can install) vs other browsers (can't)
    if (isIos()) {
        const content = isIosSafari()
            ? <IosInstructions onClose={() => setShow(false)} />
            : <IosSafariNudge onClose={() => setShow(false)} />

        return (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShow(false)}>
                <div
                    className="bg-white rounded-t-2xl w-full max-w-lg p-6 pb-10 flex flex-col gap-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <img src="/images/icon-192.png" alt="" className="w-8 h-8 rounded-xl" />
                            <p className="text-base font-bold text-brand">Install the App</p>
                        </div>
                        <button onClick={() => setShow(false)} className="text-muted text-2xl leading-none">&times;</button>
                    </div>
                    {content}
                </div>
            </div>
        )
    }

    // Android: only show if install prompt is available
    if (!installPrompt) return null

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShow(false)}>
            <div
                className="bg-white rounded-t-2xl w-full max-w-lg p-6 pb-10 flex flex-col gap-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img src="/images/icon-192.png" alt="" className="w-8 h-8 rounded-xl" />
                        <p className="text-base font-bold text-brand">Install the App</p>
                    </div>
                    <button onClick={() => setShow(false)} className="text-muted text-2xl leading-none">&times;</button>
                </div>
                <AndroidInstructions onInstall={handleAndroidInstall} onClose={() => setShow(false)} />
            </div>
        </div>
    )
}
