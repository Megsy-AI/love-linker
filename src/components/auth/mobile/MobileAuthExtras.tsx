/** @doc Mobile auth extra screens (OTP, set/reset password, forgot) — matches MobileAuthIntro. */
import { m as motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useRef } from "react";
import { t as authT, tf as authTf, useUserLang } from "@/lib/authI18n";

type ExtraScreen =
  | "otp-signup"
  | "otp-2fa"
  | "otp-reset"
  | "set-password"
  | "reset-password"
  | "forgot-password";

interface Props {
  screen: ExtraScreen;
  email: string;
  otpValues: string[];
  onOtpChange: (i: number, v: string) => void;
  onOtpKeyDown: (i: number, e: React.KeyboardEvent) => void;
  onOtpPaste: (e: React.ClipboardEvent<HTMLInputElement>, i: number) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  showNewPassword: boolean;
  setShowNewPassword: (v: boolean) => void;
  isSubmitting: boolean;
  countdown: number;
  onResendOtp: () => void;
  onSubmitSetPassword: () => void;
  region?: "arab" | "global";
  setRegion?: (r: "arab" | "global") => void;
  onSubmitResetPassword: () => void;
  onSubmitForgotPassword: () => void;
  onBack: () => void;
}

const AUTH_HERO_MP4 = "/route-assets/auth/auth-hero-v6.mp4";
const AUTH_HERO_WEBM = "/route-assets/auth/auth-hero-v6.mp4";
const AUTH_HERO_POSTER = "/route-assets/auth/auth-hero-v6-poster.jpg";

const FONT_SERIF = '"ITC Garamond Std Narrow", "Playfair Display", Garamond, serif';
const FONT_SANS = 'Inter, -apple-system, "SF Pro Text", system-ui, sans-serif';

const TopBar = ({ onBack }: { onBack: () => void }) => (
  <div className="relative z-10 px-6 pt-8 flex items-center justify-between safe-top">
    <button
      onClick={onBack}
      aria-label={authT("back")}
      className="mt-4 w-9 h-9 rounded-full grid place-items-center text-foreground/85 active:scale-95 transition-transform"
      style={{
        background: "var(--overlay-white-06)",
        border: "1px solid var(--overlay-white-12)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <ArrowLeft className="w-4 h-4" strokeWidth={1.9} />
    </button>
    <div className="w-9 h-9" />
  </div>
);

const Spinner = ({ dark = false }: { dark?: boolean }) => (
  <span
    className={`w-4 h-4 border-2 rounded-full animate-spin ${
      dark ? "border-background border-t-transparent" : "border-foreground/70 border-t-transparent"
    }`}
  />
);

const buildMeta = (
  screen: ExtraScreen,
): { title: string; sub: (email: string) => string; cta: string } => {
  switch (screen) {
    case "otp-signup":
      return {
        title: authT("verifyEmailTitle"),
        sub: (e) => authTf("otpSubTemplate", { email: e }),
        cta: authT("createAccount"),
      };
    case "otp-2fa":
      return {
        title: authT("twoFATitle"),
        sub: (e) => authTf("otp2faSubTemplate", { email: e }),
        cta: authT("signIn"),
      };
    case "otp-reset":
      return {
        title: authT("verifyEmailTitle"),
        sub: (e) => authTf("otp2faSubTemplate", { email: e }),
        cta: authT("resetPassword"),
      };
    case "set-password":
      return {
        title: authT("setPasswordTitle"),
        sub: () => authT("atLeast8"),
        cta: authT("createAccount"),
      };
    case "reset-password":
      return {
        title: authT("chooseNewPasswordTitle"),
        sub: () => authT("atLeast8"),
        cta: authT("resetPassword"),
      };
    case "forgot-password":
      return {
        title: authT("forgotTitle"),
        sub: (e) => authTf("forgotSubTemplate", { email: e }),
        cta: authT("sendResetCode"),
      };
  }
};

export default function MobileAuthExtras(p: Props) {
  useUserLang();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const meta = buildMeta(p.screen);
  const isOtp = p.screen.startsWith("otp-");
  const isPwd = p.screen === "set-password" || p.screen === "reset-password";
  const hasTypedValue = isPwd ? p.newPassword.trim().length > 0 : p.email.trim().length > 0;

  const submit = () => {
    if (p.screen === "set-password") p.onSubmitSetPassword();
    else if (p.screen === "reset-password") p.onSubmitResetPassword();
    else if (p.screen === "forgot-password") p.onSubmitForgotPassword();
  };

  const fieldStyle = {
    background: "var(--overlay-white-06)",
    border: "1px solid var(--overlay-white-14)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
  } as const;

  return (
    <div
      dir="ltr"
      className="relative min-h-[100dvh] w-full overflow-hidden bg-[#02040c] text-foreground"
      style={{ fontFamily: FONT_SANS, touchAction: "manipulation" }}
    >
      {/* Same hero clip as the sign-up screen */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        poster={AUTH_HERO_POSTER}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: "center 48%", zIndex: 0 }}
      >
        <source src={AUTH_HERO_MP4} type="video/mp4" />
      </video>

      {/* Bottom fade overlay */}
      <div
        className="absolute inset-x-0 bottom-0 h-[54%] pointer-events-none"
        style={{
          zIndex: 1,
          background:
            "linear-gradient(to bottom, rgba(2,4,12,0) 0%, rgba(2,4,12,.35) 40%, rgba(2,4,12,.85) 78%, #02040c 100%)",
        }}
      />

      <div className="relative" style={{ zIndex: 4 }}>
        <TopBar onBack={p.onBack} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={p.screen}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-x-0 bottom-0 px-6"
          style={{ zIndex: 4, paddingBottom: "max(2.25rem, env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="w-full max-w-sm mx-auto">
            <div className="mb-7 text-center">
              <h1
                className="text-foreground"
                style={{
                  fontFamily: FONT_SERIF,
                  fontWeight: 300,
                  fontSize: "42px",
                  lineHeight: "1.08",
                  letterSpacing: "0.2px",
                  textShadow: "0 1px 2px rgba(0,0,0,.4)",
                }}
              >
                {meta.title}
              </h1>
              <p
                className="mt-4 text-[14px] leading-[22px] text-foreground/85"
                style={{ fontFamily: FONT_SANS }}
              >
                {meta.sub(p.email)}
              </p>
            </div>


            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (isPwd || p.screen === "forgot-password") submit();
              }}
              className="space-y-3 w-full max-w-sm mx-auto"
            >
              {isOtp && (
                <div className="flex justify-center gap-2">
                  {p.otpValues.map((v, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        inputRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="one-time-code"
                      name={i === 0 ? "otp" : `otp-${i}`}
                      maxLength={i === 0 ? 6 : 1}
                      value={v}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        if (raw.length > 1) {
                          const fakeEvent = {
                            preventDefault: () => {},
                            stopPropagation: () => {},
                            clipboardData: { getData: () => raw },
                          } as unknown as React.ClipboardEvent<HTMLInputElement>;
                          p.onOtpPaste(fakeEvent, i);
                          return;
                        }
                        p.onOtpChange(i, raw);
                        if (raw && i < 5) inputRefs.current[i + 1]?.focus();
                      }}
                      onKeyDown={(e) => {
                        p.onOtpKeyDown(i, e);
                        if (e.key === "Backspace" && !p.otpValues[i] && i > 0)
                          inputRefs.current[i - 1]?.focus();
                      }}
                      onPaste={(e) => p.onOtpPaste(e, i)}
                      autoFocus={i === 0}
                      className="auth-input-white w-11 text-center text-[19px] font-semibold rounded-2xl !text-foreground outline-none transition-colors focus:border-foreground/40"
                      style={{ ...fieldStyle, height: 56 }}
                    />
                  ))}
                </div>
              )}

              {isPwd && (
                <div
                  className="rounded-full px-5 h-[52px] flex items-center gap-2"
                  style={fieldStyle}
                >
                  <input
                    type={p.showNewPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder={authT("atLeast8")}
                    value={p.newPassword}
                    onChange={(e) => p.setNewPassword(e.target.value)}
                    autoFocus
                      className="auth-input-white flex-1 bg-transparent outline-none text-[15px] !text-foreground placeholder:!text-foreground/65"
                  />
                  <button
                    type="button"
                    onClick={() => p.setShowNewPassword(!p.showNewPassword)}
                    className="text-foreground/50 hover:text-foreground/80 transition-colors"
                    aria-label="toggle password"
                  >
                    {p.showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}

              {p.screen === "forgot-password" && (
                <div
                  className="rounded-full px-5 h-[52px] flex items-center"
                  style={fieldStyle}
                >
                  <input
                    type="email"
                    value={p.email}
                    disabled
                    className="auth-input-white w-full bg-transparent outline-none text-[15px] !text-foreground/70"
                  />
                </div>
              )}

              {!isOtp && (
                <button
                  type="submit"
                  disabled={p.isSubmitting}
                  className={`w-full h-[52px] rounded-full flex items-center justify-center gap-2 active:scale-[0.985] transition-colors duration-300 disabled:opacity-50 ${
                    hasTypedValue
                      ? "theme-fixed bg-white text-background border border-white"
                      : "bg-transparent text-foreground border border-foreground/30"
                  }`}
                  style={{ fontSize: "15px", fontWeight: 600, letterSpacing: "0.1px" }}
                >
                  {p.isSubmitting ? (
                    <Spinner dark={hasTypedValue} />
                  ) : (
                    <>
                      {meta.cta}
                      <ArrowRight className="w-4 h-4" strokeWidth={2} />
                    </>
                  )}
                </button>
              )}

              {isOtp && (
                <div className="text-center pt-3">
                  {p.countdown > 0 ? (
                    <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                      {authTf("resendInSecondsTemplate", { n: p.countdown })}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={p.onResendOtp}
                      disabled={p.isSubmitting}
                      className="text-[13px] text-foreground/85 underline underline-offset-4 decoration-foreground/25 disabled:opacity-50"
                    >
                      {authT("resendCode")}
                    </button>
                  )}
                  {p.isSubmitting && (
                    <div className="mt-3 flex justify-center">
                      <Spinner />
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
