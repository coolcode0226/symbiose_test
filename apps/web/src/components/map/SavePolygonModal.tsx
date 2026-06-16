// components/SavePolygonModal.tsx
'use client';

import { useState } from 'react';
import { X, Trees, Ruler } from 'lucide-react';

interface SavePolygonModalProps {
    geometry: any;
    onClose: () => void;
    onSaved: (name: string) => void;
}

export function SavePolygonModal({ geometry, onClose, onSaved }: SavePolygonModalProps) {
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);

    // Calculate approximate area client-side for display
    const approximateArea = () => {
        // Rough estimate - actual calculation done server-side with PostGIS
        return 'Calculating...';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setSaving(true);
        await onSaved(name.trim());
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="p-4 bg-[#0b4a59] text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Trees size={20} />
                        <h3 className="font-semibold text-lg">Save Forest Analysis</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="hover:bg-white/20 rounded p-1 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Info */}
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <div className="flex items-center gap-2 text-blue-700 mb-1">
                            <Ruler size={16} />
                            <span className="text-sm font-medium">Polygon drawn successfully</span>
                        </div>
                        <p className="text-xs text-blue-600">
                            We'll analyze tree species and calculate exact surface areas in hectares.
                        </p>
                    </div>

                    {/* Name Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Polygon Name *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Forest Sector North, Zone A, etc."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4a59] focus:border-transparent outline-none text-sm"
                            required
                            autoFocus
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !name.trim()}
                            className="flex-1 px-4 py-2 text-white bg-[#0b4a59] hover:bg-[#083d48] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Trees size={16} />
                                    Analyze & Save
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}