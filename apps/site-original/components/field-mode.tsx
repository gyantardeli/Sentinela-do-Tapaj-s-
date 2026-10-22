"use client";
import { createContext, useContext } from "react";
export const FieldModeContext = createContext(false);
export function useFieldMode() { return useContext(FieldModeContext); }
