"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Chrome,
  Puzzle,
  FolderOpen,
  ToggleRight,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  FileCode,
} from "lucide-react";

// Firefox icon component
function FirefoxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.066 6.066c.587.587 1.107 1.24 1.543 1.943-.19-.036-.396-.06-.614-.06-.936 0-1.727.608-2.006 1.45-.02-.003-.04-.003-.06-.003-1.39 0-2.52 1.13-2.52 2.52 0 .02 0 .04.003.06-.842.279-1.45 1.07-1.45 2.006 0 .218.024.424.06.614-.703-.436-1.356-.956-1.943-1.543-2.343-2.343-3.066-5.76-1.943-8.66.19.036.396.06.614.06.936 0 1.727-.608 2.006-1.45.02.003.04.003.06.003 1.39 0 2.52-1.13 2.52-2.52 0-.02 0-.04-.003-.06.842-.279 1.45-1.07 1.45-2.006 0-.218-.024-.424-.06-.614 2.9 1.123 6.317 1.846 8.66 4.189z" />
    </svg>
  );
}

type BrowserTab = "chrome" | "firefox";

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const chromeSteps: Step[] = [
  {
    icon: <Download className="size-5" />,
    title: "Download the Extension",
    description:
      "Click the download button below to get the Chrome extension ZIP file. Extract it to a folder on your computer.",
  },
  {
    icon: <Puzzle className="size-5" />,
    title: "Open Extensions Page",
    description:
      'Open Chrome and navigate to chrome://extensions or click the puzzle icon in the toolbar and select "Manage Extensions".',
  },
  {
    icon: <ToggleRight className="size-5" />,
    title: "Enable Developer Mode",
    description:
      'Toggle on "Developer mode" in the top-right corner of the extensions page.',
  },
  {
    icon: <FolderOpen className="size-5" />,
    title: "Load the Extension",
    description:
      'Click "Load unpacked" and select the extracted extension folder. The Flow extension should now appear in your extensions list.',
  },
  {
    icon: <CheckCircle2 className="size-5" />,
    title: "Pin the Extension",
    description:
      "Click the puzzle icon in Chrome's toolbar and pin Flow for easy access. You're all set!",
  },
];

const firefoxSteps: Step[] = [
  {
    icon: <Download className="size-5" />,
    title: "Download the Extension",
    description:
      "Click the download button below to get the Firefox extension folder. Extract it to a location on your computer.",
  },
  {
    icon: <Puzzle className="size-5" />,
    title: "Open Debugging Page",
    description:
      'Open Firefox and type "about:debugging#/runtime/this-firefox" in the address bar, then press Enter.',
  },
  {
    icon: <FolderOpen className="size-5" />,
    title: "Load Temporary Add-on",
    description:
      'Click "Load Temporary Add-on..." button on the debugging page.',
  },
  {
    icon: <FileCode className="size-5" />,
    title: "Select manifest.json",
    description:
      'Navigate to the extracted extension folder and select the "manifest.json" file specifically. This is important - you must select the manifest.json file, not the folder.',
  },
  {
    icon: <CheckCircle2 className="size-5" />,
    title: "Extension Loaded",
    description:
      "The Flow extension is now installed! Note: Temporary add-ons are removed when Firefox closes, so you'll need to reload it each time you restart the browser.",
  },
];

const downloadLinks = {
  chrome:
    "https://cdn.discordapp.com/attachments/1451182198957801512/1451182227886182551/extension-google.zip?ex=69453e44&is=6943ecc4&hm=c6aec9db645b411c2f43d6eb32bf0fff87c9e1dda451135438c26c2f8a31bd5d&",
  firefox:
    "https://cdn.discordapp.com/attachments/1451182198957801512/1451182241068748842/extension-firefox.zip?ex=69453e47&is=6943ecc7&hm=c0e22aa831b77e7fc53fb2001bb1e162c4a5b4daea6aac7dba371939a1edbf41&",
};

export default function InstallExtensionPage() {
  const [activeTab, setActiveTab] = useState<BrowserTab>("chrome");

  const steps = activeTab === "chrome" ? chromeSteps : firefoxSteps;

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500/20 to-violet-500/20 shadow-lg shadow-indigo-500/10">
            <Sparkles className="size-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">
              Install Extension
            </h1>
            <p className="text-zinc-400 text-sm">
              Get the Flow browser extension to block distracting websites
            </p>
          </div>
        </div>
      </div>

      {/* Browser Selection */}
      <Card className="bg-zinc-900/50 border-zinc-800/60 shadow-xl shadow-black/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg text-white">
            Choose Your Browser
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setActiveTab("chrome")}
              className={`relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200 ${
                activeTab === "chrome"
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-zinc-800 bg-zinc-800/30 hover:border-zinc-700 hover:bg-zinc-800/50"
              }`}
            >
              {activeTab === "chrome" && (
                <Badge className="absolute -top-2 -right-2 bg-indigo-500 text-white text-xs">
                  Selected
                </Badge>
              )}
              <Chrome
                className={`size-10 ${
                  activeTab === "chrome" ? "text-indigo-400" : "text-zinc-400"
                }`}
              />
              <div className="text-center">
                <p
                  className={`font-medium ${
                    activeTab === "chrome" ? "text-white" : "text-zinc-300"
                  }`}
                >
                  Google Chrome
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Also works with Edge, Brave, Opera
                </p>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("firefox")}
              className={`relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200 ${
                activeTab === "firefox"
                  ? "border-orange-500 bg-orange-500/10"
                  : "border-zinc-800 bg-zinc-800/30 hover:border-zinc-700 hover:bg-zinc-800/50"
              }`}
            >
              {activeTab === "firefox" && (
                <Badge className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs">
                  Selected
                </Badge>
              )}
              <FirefoxIcon
                className={`size-10 ${
                  activeTab === "firefox" ? "text-orange-400" : "text-zinc-400"
                }`}
              />
              <div className="text-center">
                <p
                  className={`font-medium ${
                    activeTab === "firefox" ? "text-white" : "text-zinc-300"
                  }`}
                >
                  Mozilla Firefox
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Temporary add-on installation
                </p>
              </div>
            </button>
          </div>

          {/* Download Button */}
          <div className="pt-4">
            <Button
              asChild
              className={`w-full py-6 text-base font-medium shadow-lg ${
                activeTab === "chrome"
                  ? "bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-500/20"
                  : "bg-linear-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 shadow-orange-500/20"
              }`}
            >
              <a
                href={downloadLinks[activeTab]}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="size-5 mr-2" />
                Download for {activeTab === "chrome" ? "Chrome" : "Firefox"}
                <ExternalLink className="size-4 ml-2 opacity-60" />
              </a>
            </Button>
            <p className="text-center text-xs text-zinc-500 mt-3">
              {activeTab === "chrome"
                ? "Compatible with Chrome, Edge, Brave, Opera, and other Chromium-based browsers"
                : "Works with Firefox 109 and newer versions"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Installation Steps */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span
            className={`size-6 rounded-full flex items-center justify-center text-xs font-bold ${
              activeTab === "chrome"
                ? "bg-indigo-500/20 text-indigo-400"
                : "bg-orange-500/20 text-orange-400"
            }`}
          >
            {steps.length}
          </span>
          Installation Steps
        </h2>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <Card
              key={index}
              className="bg-zinc-900/50 border-zinc-800/60 shadow-lg shadow-black/10"
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                      activeTab === "chrome"
                        ? "bg-indigo-500/20 text-indigo-400"
                        : "bg-orange-500/20 text-orange-400"
                    }`}
                  >
                    <span className="text-sm font-bold">{index + 1}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          activeTab === "chrome"
                            ? "text-indigo-400"
                            : "text-orange-400"
                        }
                      >
                        {step.icon}
                      </span>
                      <h3 className="font-semibold text-white">{step.title}</h3>
                    </div>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Important Notes */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
            <span className="text-amber-400 text-lg">⚠️</span>
          </div>
          <div>
            <h4 className="font-medium text-amber-400 mb-1">Important Notes</h4>
            <ul className="text-sm text-amber-200/70 space-y-1">
              <li>
                • Make sure you&apos;re logged into Flow before using the
                extension
              </li>
              <li>
                • The extension syncs automatically with your Flow account
              </li>
              <li>
                • Keep the extension folder in a permanent location (don&apos;t
                delete it)
              </li>
              {activeTab === "firefox" && (
                <li>
                  • Firefox temporary add-ons need to be reloaded after browser
                  restart
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
