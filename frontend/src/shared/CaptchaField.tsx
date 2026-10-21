import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { api } from "./api";
import { T } from "./text";
import { Button, Field } from "./ui";

type CaptchaChallenge = { challenge: string; question: string };

export function useCaptcha() {
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null);
  const [answer, setAnswer] = useState("");

  const refresh = useCallback(async () => {
    const next = await api.get<CaptchaChallenge>("/auth/captcha/");
    setChallenge(next);
    setAnswer("");
  }, []);

  useEffect(() => {
    void refresh().catch(() => {});
  }, [refresh]);

  return { challenge, answer, setAnswer, refresh };
}

export function CaptchaField({
  captcha,
  error,
}: {
  captcha: ReturnType<typeof useCaptcha>;
  error?: string;
}) {
  return (
    <Field label={T.auth.captcha} required hint={T.auth.captchaHint} error={error}>
      {(id, bad) => (
        <div className="row" style={{ alignItems: "stretch" }}>
          <span className="input" style={{ display: "flex", alignItems: "center", minWidth: 112, background: "var(--surface-soft)", fontWeight: 700 }} aria-live="polite">
            {captcha.challenge?.question ?? "..."}
          </span>
          <input
            id={id}
            className="input grow"
            inputMode="numeric"
            autoComplete="off"
            aria-invalid={bad}
            value={captcha.answer}
            onChange={(e) => captcha.setAnswer(e.target.value)}
            placeholder={T.auth.captchaPh}
            required
          />
          <Button type="button" variant="ghost" aria-label={T.auth.captchaRefresh} icon={<RefreshCw />} onClick={() => void captcha.refresh()} />
        </div>
      )}
    </Field>
  );
}
