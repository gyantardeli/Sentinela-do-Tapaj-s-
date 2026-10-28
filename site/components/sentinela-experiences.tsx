"use client";
import { useEffect, useRef } from "react";
import { mountExperiences } from "../lib/experiences-runtime";

export default function SentinelaExperiences({ onDiary }: { onDiary: () => void }) {
  const callback = useRef(onDiary);
  callback.current = onDiary;
  useEffect(() => mountExperiences(() => callback.current()), []);
  return null;
}
