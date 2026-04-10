"use client";

import { useState } from "react";
import type { OnboardingData } from "@/app/onboarding/page";

type Props = {
  data: OnboardingData;
  onNext: (patch: Partial<OnboardingData>) => void;
};

export default function StepName({ data, onNext }: Props) {
  const [firstName, setFirstName] = useState(data.firstName);
  const [lastName, setLastName] = useState(data.lastName);
  const [phone, setPhone] = useState(data.phone);
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(data.whatsappSameAsPhone);
  const [whatsapp, setWhatsapp] = useState(data.whatsapp);

  const valid =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    phone.trim().length >= 10 &&
    (whatsappSameAsPhone || whatsapp.trim().length >= 10);

  return (
    <div className="flex flex-col flex-1 gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">
          Let&apos;s get started
        </h1>
        <p className="text-gray-500">
          We&apos;ll find every opportunity you qualify for.
        </p>
      </div>

      <div className="space-y-4 flex-1">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Your first name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="e.g. Thabo"
            className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Your last name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="e.g. Mokoena"
            className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Phone number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 0821234567"
            className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">WhatsApp number</label>
            <button
              type="button"
              onClick={() => {
                setWhatsappSameAsPhone((value) => {
                  const next = !value;
                  if (next) setWhatsapp(phone);
                  else setWhatsapp("");
                  return next;
                });
              }}
              className="flex items-center gap-2 text-xs text-gray-500"
            >
              <div
                className={`w-8 h-4 rounded-full transition-colors flex items-center px-0.5 ${
                  whatsappSameAsPhone ? "bg-orange-500" : "bg-gray-200"
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${
                    whatsappSameAsPhone ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </div>
              Same as phone
            </button>
          </div>
          <input
            type="tel"
            value={whatsappSameAsPhone ? phone : whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="e.g. 0821234567"
            disabled={whatsappSameAsPhone}
            className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>
      </div>

      <button
        onClick={() =>
          onNext({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim(),
            whatsappSameAsPhone,
            whatsapp: whatsappSameAsPhone ? phone.trim() : whatsapp.trim(),
          })
        }
        disabled={!valid}
        className="w-full bg-orange-500 text-white py-4 rounded-2xl font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-600 transition-colors"
      >
        Continue
      </button>
    </div>
  );
}
