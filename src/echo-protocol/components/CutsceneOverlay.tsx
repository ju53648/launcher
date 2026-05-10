import { useEffect, useState } from "react";

import { getCutsceneAssetSlot } from "../data/cutsceneAssets";
import type { EchoCutscene } from "../data/cutscenes";

export function CutsceneOverlay({
  cutscene,
  slideIndex,
  onAdvance
}: {
  cutscene: EchoCutscene;
  slideIndex: number;
  onAdvance: () => void;
}) {
  const slide = cutscene.slides[slideIndex];
  const lastSlide = slideIndex === cutscene.slides.length - 1;
  const slot = getCutsceneAssetSlot(slide.assetId);
  const [resolvedAssetUrl, setResolvedAssetUrl] = useState<string | null>(null);
  const [resolvedAssetKind, setResolvedAssetKind] = useState<"image" | "video" | null>(null);

  useEffect(() => {
    let cancelled = false;
    setResolvedAssetUrl(null);
    setResolvedAssetKind(null);

    async function resolveAsset() {
      if (!slot) {
        return;
      }

      for (const filename of slot.acceptedFiles) {
        const url = `${slot.dropFolder}/${filename}`;
        try {
          let response = await fetch(url, { method: "HEAD", cache: "no-store" });
          if (!response.ok && (response.status === 405 || response.status === 501)) {
            response = await fetch(url, { cache: "no-store" });
          }
          if (!response.ok || cancelled) {
            continue;
          }
          const extension = filename.split(".").pop()?.toLowerCase();
          setResolvedAssetUrl(url);
          setResolvedAssetKind(extension === "mp4" || extension === "webm" ? "video" : "image");
          return;
        } catch {
          continue;
        }
      }
    }

    void resolveAsset();
    return () => {
      cancelled = true;
    };
  }, [slot, slide.assetId]);

  const usingPlaceholder = !resolvedAssetUrl;

  return (
    <div className="echo-cutscene-overlay" role="dialog" aria-modal="true">
      <div className="echo-cutscene-overlay__backdrop" />
      <section className={`echo-cutscene echo-cutscene--${slide.frame}`}>
        <div className="echo-cutscene__frame">
          {resolvedAssetUrl ? (
            resolvedAssetKind === "video" ? (
              <video
                autoPlay
                className="echo-cutscene__media"
                loop
                muted
                playsInline
                src={resolvedAssetUrl}
              />
            ) : (
              <img
                alt={slide.title}
                className="echo-cutscene__media"
                src={resolvedAssetUrl}
              />
            )
          ) : slot ? (
            <img
              alt={`${slide.title} placeholder`}
              className="echo-cutscene__media echo-cutscene__media--placeholder"
              src={slot.placeholderFile}
            />
          ) : null}
          <div className="echo-cutscene__frame-label">
            {usingPlaceholder ? slide.placeholderLabel : `${slot?.label ?? "Cutscene asset"} loaded`}
          </div>
          <div className="echo-cutscene__frame-meta">{slide.neededAsset}</div>
        </div>
        <div className="echo-cutscene__body">
          <p className="echo-cutscene__overline">{slide.overline}</p>
          {(slide.sourceTag || slide.timecode) && (
            <div className="echo-cutscene__meta-strip">
              {slide.sourceTag ? <span>{slide.sourceTag}</span> : null}
              {slide.timecode ? <span>{slide.timecode}</span> : null}
            </div>
          )}
          <h3>{slide.title}</h3>
          <p>{slide.body}</p>
          {slide.direction ? (
            <div className="echo-cutscene__note">
              <small>Regie / Stimmung</small>
              <p>{slide.direction}</p>
            </div>
          ) : null}
          {slide.scriptLine ? (
            <blockquote className="echo-cutscene__script">"{slide.scriptLine}"</blockquote>
          ) : null}
          {slide.audioCue ? (
            <div className="echo-cutscene__audio">
              <small>Audio cue</small>
              <p>{slide.audioCue}</p>
            </div>
          ) : null}
          {slot ? (
            <div className="echo-cutscene__asset-slot">
              <small>Asset slot</small>
              <p>
                <strong>{slot.label}</strong>
                {" "}
                {slot.note}
              </p>
              <p className="echo-cutscene__slot-path">
                {slot.dropFolder}
                /
                {slot.acceptedFiles[0]}
              </p>
              <p className="echo-cutscene__slot-files">
                Akzeptiert: {slot.acceptedFiles.join(", ")}
              </p>
            </div>
          ) : null}
          <div className="echo-cutscene__footer">
            <small>{`Slide ${slideIndex + 1} / ${cutscene.slides.length}  |  Enter / Leertaste`}</small>
            <button className="echo-button echo-button--primary" onClick={onAdvance} type="button">
              {lastSlide ? "Zur Szene" : "Weiter"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
