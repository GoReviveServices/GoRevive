"use client";

import React from 'react';

const formatGrade = (grade) => grade?.length === 1 ? `Grade ${grade}` : grade;

export default function Configurator({ 
    availableGrades, 
    specOptions, 
    selectedGrade, 
    setSelectedGrade, 
    selectedSpecs, 
    setSelectedSpecs 
}) {
    return (
        <div className="space-y-5">
            {/* Grade Selector */}
            {availableGrades.length > 0 && (
                <div>
                    <p className="font-semibold text-gray-600 text-sm mb-3">Condition Grade</p>
                    <div className="flex flex-wrap gap-2">
                        {availableGrades.map(grade => (
                            <button
                                key={grade}
                                onClick={() => setSelectedGrade(grade)}
                                className={`px-5 py-2 rounded-[10px] text-sm font-bold transition-colors border-2 ${
                                    selectedGrade === grade 
                                    ? 'border-[#1B5E3B] text-[#1B5E3B] bg-[#F0FAF5] shadow-sm' 
                                    : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
                                }`}
                            >
                                {formatGrade(grade)}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Spec Selectors (RAM, Storage, etc.) */}
            {Object.entries(specOptions).map(([specName, options]) => (
                <div key={specName}>
                    <p className="mb-2.5 text-sm font-bold capitalize text-[#0B2136]">{specName}</p>
                    <div className="flex flex-wrap gap-2">
                        {options.map(option => (
                            <button
                                key={option}
                                onClick={() => setSelectedSpecs(prev => ({ ...prev, [specName]: option }))}
                                className={`px-4 py-2 rounded-[10px] text-sm font-bold transition-colors border-2 ${
                                    selectedSpecs[specName] === option 
                                    ? 'border-[#1B5E3B] text-[#1B5E3B] bg-[#F0FAF5] shadow-sm' 
                                    : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
                                }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}