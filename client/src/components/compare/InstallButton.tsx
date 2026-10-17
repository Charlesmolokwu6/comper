import { Download, Share, SquarePlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useInstall } from "@/hooks/useInstall";

const buttonClass =
  "inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary";

/** Header button to add Compare to the home screen. Hidden where there's nothing to offer. */
export function InstallButton() {
  const { mode, install } = useInstall();
  if (!mode) return null;

  if (mode === "prompt")
    return (
      <button type="button" onClick={install} className={buttonClass}>
        <Download aria-hidden className="size-4" />
        Install app
      </button>
    );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className={buttonClass}>
          <Download aria-hidden className="size-4" />
          Install app
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Compare to your home screen</DialogTitle>
          <DialogDescription>
            It opens full screen like an app. Free, no App Store needed.
          </DialogDescription>
        </DialogHeader>
        <ol className="space-y-3 text-sm">
          <li className="flex items-center gap-3">
            <Share aria-hidden className="size-5 shrink-0 text-primary" />
            <span>
              In Safari, tap the <strong>Share</strong> button at the bottom of
              the screen.
            </span>
          </li>
          <li className="flex items-center gap-3">
            <SquarePlus aria-hidden className="size-5 shrink-0 text-primary" />
            <span>
              Scroll down and tap <strong>Add to Home Screen</strong>, then{" "}
              <strong>Add</strong>.
            </span>
          </li>
        </ol>
      </DialogContent>
    </Dialog>
  );
}
