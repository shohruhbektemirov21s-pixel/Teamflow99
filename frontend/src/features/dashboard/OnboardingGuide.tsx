import { ChevronRight, HelpCircle, Lightbulb, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { isManager, useMe } from "@/app/auth";
import { useModal } from "@/app/modals";
import { Button } from "@/shared/ui";

interface OnboardingGuideProps {
  onNewOrder?: () => void;
}

export function OnboardingGuide({ onNewOrder }: OnboardingGuideProps) {
  const me = useMe();
  const { open } = useModal();
  const storageKey = `tf_guide_dismissed_${me?.role || "user"}`;

  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
  };

  const handleReopen = () => {
    setDismissed(false);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  };

  if (dismissed) {
    return (
      <div className="onboarding-reopen-wrap">
        <Button
          variant="ghost"
          size="sm"
          className="onboarding-reopen-btn"
          icon={<HelpCircle size={15} />}
          onClick={handleReopen}
          title="Tizimdan foydalanish bo‘yicha tezkor qo‘llanma"
        >
          Qo‘llanma
        </Button>
      </div>
    );
  }

  const isMgr = isManager(me);
  const isDept = me?.role === "department";

  return (
    <section className="onboarding-banner" aria-label="Tezkor moslashuv qo'llanmasi">
      <div className="onboarding-header">
        <div className="onboarding-title-group">
          <span className="onboarding-badge">
            <Sparkles size={14} /> 1 daqiqada o‘rganish
          </span>
          <h3>
            Xush kelibsiz, {me?.first_name || me?.username}! Boshlash uchun 3 ta qadam:
          </h3>
        </div>
        <button
          type="button"
          className="onboarding-close"
          onClick={handleDismiss}
          aria-label="Qo'llanmani yopish"
          title="Tushunarli, yopish"
        >
          <X size={16} /> <span>Tushunarli</span>
        </button>
      </div>

      <div className="onboarding-steps">
        {isMgr ? (
          <>
            <div className="onboarding-step">
              <span className="onboarding-step-num">1</span>
              <div>
                <strong>Buyurtmalarni ko‘ring</strong>
                <p>Boshqarmalardan kelgan yangi TZ'larni tekshiring va tasdiqlang.</p>
                <Link to="/buyurtmalar" className="onboarding-step-link">
                  Buyurtmalar <ChevronRight size={14} />
                </Link>
              </div>
            </div>

            <div className="onboarding-step">
              <span className="onboarding-step-num">2</span>
              <div>
                <strong>Loyiha va topshiriq bering</strong>
                <p>Xodimlarni jamoaga yig‘ib, har biriga alohida topshiriq biriktiring.</p>
                <button
                  type="button"
                  className="onboarding-step-link btn-link-inline"
                  onClick={() => open({ new: "project" })}
                >
                  + Yangi loyiha <ChevronRight size={14} />
                </button>
              </div>
            </div>

            <div className="onboarding-step">
              <span className="onboarding-step-num">3</span>
              <div>
                <strong>Natijalarni tekshiring</strong>
                <p>Topshirilgan ishlarni qabul qiling yoki izoh bilan qaytaring.</p>
                <Link to="/tekshiruv" className="onboarding-step-link">
                  Tekshiruv navbati <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          </>
        ) : isDept ? (
          <>
            <div className="onboarding-step">
              <span className="onboarding-step-num">1</span>
              <div>
                <strong>Buyurtma (TZ) yuboring</strong>
                <p>Talablaringizni yozing va Word (.docx) faylini ilova qiling.</p>
                <button
                  type="button"
                  className="onboarding-step-link btn-link-inline"
                  onClick={onNewOrder || (() => open({ new: "order" }))}
                >
                  + Yangi buyurtma <ChevronRight size={14} />
                </button>
              </div>
            </div>

            <div className="onboarding-step">
              <span className="onboarding-step-num">2</span>
              <div>
                <strong>Holatni kuzating</strong>
                <p>Menejer ko‘rib chiqishi va loyihaga aylantirishini shu yerda ko‘ring.</p>
                <span className="onboarding-hint-pill">Real vaqtda yangilanadi</span>
              </div>
            </div>

            <div className="onboarding-step">
              <span className="onboarding-step-num">3</span>
              <div>
                <strong>Yakuniy natijani tasdiqlang</strong>
                <p>Ish bajarilgach, hisobot va yakuniy fayllarni ko‘rib qabul qiling.</p>
                <span className="onboarding-hint-pill">Modalda Word ko‘rish</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="onboarding-step">
              <span className="onboarding-step-num">1</span>
              <div>
                <strong>Mening ishim doskasini oching</strong>
                <p>Sizga biriktirilgan barcha faol topshiriqlarni ustunlar bo‘yicha ko‘ring.</p>
                <Link to="/mening-ishim" className="onboarding-step-link">
                  Doskaga o‘tish <ChevronRight size={14} />
                </Link>
              </div>
            </div>

            <div className="onboarding-step">
              <span className="onboarding-step-num">2</span>
              <div>
                <strong>Ishni boshlang</strong>
                <p>Topshiriqni ochib "Boshlash"ni bosing yoki "Jarayonda"ga suring.</p>
                <span className="onboarding-hint-pill">Vaqt hisobi yuritiladi</span>
              </div>
            </div>

            <div className="onboarding-step">
              <span className="onboarding-step-num">3</span>
              <div>
                <strong>Tekshiruvga yuboring</strong>
                <p>Bajarilgan ish tafsilotlarini yozib, natijani menejerga topshiring.</p>
                <span className="onboarding-hint-pill">Izoh va fayllar bilan</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="onboarding-footer">
        <span className="onboarding-tip">
          <Lightbulb size={15} /> <strong>Tezkor maslahat:</strong> Istalgan joyda{" "}
          <kbd>Ctrl</kbd> + <kbd>K</kbd> tugmasini bosib, topshiriq kodi yoki odamni 1 soniyada topishingiz mumkin.
        </span>
      </div>
    </section>
  );
}
