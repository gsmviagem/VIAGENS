"use client";

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BlackCalendarProps {
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    onChange: (startDate: string, endDate: string) => void;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function BlackCalendar({ startDate, endDate, onChange }: BlackCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(() => {
        let sd = new Date();
        if (startDate) {
            sd = new Date(startDate);
            sd.setUTCHours(12); // avoid timezone issues
        }
        return sd;
    });
    
    // Internal state for click UX
    // 0 = resting, 1 = selecting end date
    const [selectingStep, setSelectingStep] = useState<0 | 1>(0);

    const sd = startDate ? new Date(startDate) : null;
    if (sd) sd.setUTCHours(12);
    const ed = endDate ? new Date(endDate) : null;
    if (ed) ed.setUTCHours(12);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(year, month + 1, 1));
    };

    const padZero = (n: number) => n.toString().padStart(2, '0');

    const handleDayClick = (day: number) => {
        const clickedDate = new Date(year, month, day, 12, 0, 0);
        const yyyyMmDd = `${clickedDate.getFullYear()}-${padZero(clickedDate.getMonth() + 1)}-${padZero(clickedDate.getDate())}`;

        if (selectingStep === 0) {
            onChange(yyyyMmDd, yyyyMmDd); // resets and starts range
            setSelectingStep(1);
        } else {
            // we are selecting the end date
            const newStart = sd ? sd.getTime() : 0;
            const clickedTime = clickedDate.getTime();
            
            if (clickedTime < newStart) {
                // if they click before start, just flip them
                onChange(yyyyMmDd, startDate);
            } else {
                onChange(startDate, yyyyMmDd);
            }
            setSelectingStep(0);
        }
    };

    // Calculate dates for rendering
    const blanks = Array.from({ length: firstDay }, (_, i) => i);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const isDateEqual = (d1: Date | null, y: number, m: number, d: number) => {
        if (!d1) return false;
        return d1.getFullYear() === y && d1.getMonth() === m && d1.getDate() === d;
    };

    const isDateInRange = (d1: Date | null, d2: Date | null, y: number, m: number, d: number) => {
        if (!d1 || !d2) return false;
        const target = new Date(y, m, d, 12, 0, 0).getTime();
        const start = Math.min(d1.getTime(), d2.getTime());
        const end = Math.max(d1.getTime(), d2.getTime());
        return target >= start && target <= end;
    };

    return (
        <div className="w-full bg-[#0a0a0a] border border-white/5 rounded-md p-4 text-white font-sans select-none">
            <div className="flex justify-between items-center mb-4">
                <button onClick={handlePrevMonth} className="text-white/50 hover:text-white transition cursor-pointer p-1">
                    <ChevronLeft size={18} />
                </button>
                <div className="font-medium text-sm text-[#e0e0e0]">
                    {MONTHS[month]} {year}
                </div>
                <button onClick={handleNextMonth} className="text-white/50 hover:text-white transition cursor-pointer p-1">
                    <ChevronRight size={18} />
                </button>
            </div>
            
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="text-[10px] uppercase font-black tracking-wider text-white/30">
                        {d}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1">
                {blanks.map(b => <div key={`blank-${b}`} />)}
                {days.map(d => {
                    const isStart = isDateEqual(sd, year, month, d);
                    const isEnd = isDateEqual(ed, year, month, d);
                    const inRange = isDateInRange(sd, ed, year, month, d);
                    
                    let bgClass = "transparent";
                    let textClass = "text-white/70";
                    
                    if (isStart || isEnd) {
                        bgClass = "bg-[#f97316]"; // Vivid Orange Default
                        textClass = "text-black font-bold";
                    } else if (inRange) {
                        bgClass = "bg-[#2a2a2a]"; // Dark Grey Highlight
                        textClass = "text-white/90";
                    } else {
                        bgClass = "hover:bg-white/5";
                    }

                    return (
                        <div key={d} className={`h-8 flex justify-center items-center ${inRange && !isStart && !isEnd ? 'bg-[#2a2a2a]' : ''}`}>
                             <button
                                onClick={() => handleDayClick(d)}
                                className={`w-8 h-8 rounded-full flex justify-center items-center text-xs transition-colors duration-200 ${bgClass} ${textClass}`}
                            >
                                {d}
                            </button>
                        </div>
                    );
                })}
            </div>
            
            {selectingStep === 1 && (
                <div className="text-[10px] text-orange-400 mt-2 text-center uppercase tracking-widest font-bold animate-pulse">
                    Select the end date
                </div>
            )}
        </div>
    );
}
