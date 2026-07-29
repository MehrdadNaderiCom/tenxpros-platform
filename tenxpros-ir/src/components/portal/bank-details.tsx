import { Landmark, ShieldCheck } from "lucide-react";

import { CopyButton } from "@/components/ui/copy-button";
import { BANK_DETAILS } from "@/lib/constants";

const persianNumber = new Intl.NumberFormat("fa-IR");

type BankRowProps = {
  label: string;
  value: string;
};

function BankRow({ label, value }: BankRowProps) {
  return (
    <div className="grid gap-2 border-b border-white/10 py-4 last:border-0 sm:grid-cols-[8rem_1fr_auto] sm:items-center">
      <span className="text-sm text-slate-400">{label}</span>
      <bdi
        dir="ltr"
        className="overflow-wrap-anywhere font-mono text-sm font-bold tracking-wide text-white sm:text-base"
      >
        {value}
      </bdi>
      <CopyButton value={value} label={`کپی ${label}`} />
    </div>
  );
}

export function BankDetails({
  standardPriceToman,
  foundingPriceToman,
}: {
  standardPriceToman: number;
  foundingPriceToman: number;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-credential/30 bg-gradient-to-br from-credential/10 via-white/[0.05] to-iris-500/10 shadow-panel">
      <div className="border-b border-white/10 p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-credential">
              <Landmark className="size-5" />
              <span className="text-xs font-black uppercase tracking-[0.18em]">
                Founding Charter
              </span>
            </div>
            <h2 className="mt-3 text-2xl font-black text-white">پرداخت شهریه دوره</h2>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              مبلغ ویژه اعضای مؤسس برای ظرفیت اولیه دوره
            </p>
          </div>
          <div className="rounded-lg border border-credential/25 bg-black/20 px-5 py-4 text-left">
            <p className="text-xs text-slate-400">
              قیمت اصلی {persianNumber.format(standardPriceToman)} تومان
            </p>
            <p className="mt-1 text-2xl font-black text-credential" dir="rtl">
              {persianNumber.format(foundingPriceToman)} تومان
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 sm:px-7">
        <BankRow label="صاحب حساب" value={BANK_DETAILS.holder} />
        <BankRow label="بانک" value={BANK_DETAILS.bank} />
        <BankRow label="شماره کارت" value={BANK_DETAILS.card} />
        <BankRow label="شماره شبا" value={BANK_DETAILS.iban} />
        <BankRow label="شماره حساب" value={BANK_DETAILS.account} />
      </div>

      <div className="flex gap-3 border-t border-white/10 bg-black/15 px-5 py-4 text-xs leading-6 text-slate-300 sm:px-7">
        <ShieldCheck className="mt-1 size-4 shrink-0 text-emerald-300" />
        <p>
          پیش از واریز، نام صاحب حساب و مبلغ را کنترل کنید. رسید فقط در فضای خصوصی
          نگهداری می‌شود و در دسترس عموم قرار نمی‌گیرد.
        </p>
      </div>
    </div>
  );
}
