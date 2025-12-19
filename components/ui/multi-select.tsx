"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Command, CommandGroup, CommandItem, CommandList } from "cmdk" // Assuming typical shadcn setup, but if not installed I'll use a simpler fallback. 
// WAIT, I saw no 'command.tsx' in the list. I should NOT assume 'cmdk' is installed.
// I will rewrite this to be pure React/Taiwind without external 'cmdk' dependency to be safe.

interface Option {
    value: string
    label: string
}

interface MultiSelectProps {
    options: Option[]
    selected: string[]
    onChange: (selected: string[]) => void
    placeholder?: string
    className?: string
}

export function MultiSelect({ options, selected, onChange, placeholder = "Select...", className }: MultiSelectProps) {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const inputRef = React.useRef<HTMLInputElement>(null)

    const handleSelect = (value: string) => {
        if (selected.includes(value)) {
            onChange(selected.filter((item) => item !== value))
        } else {
            onChange([...selected, value])
        }
        setQuery("")
        inputRef.current?.focus()
    }

    const handleRemove = (value: string) => {
        onChange(selected.filter((item) => item !== value))
    }

    const filteredOptions = options.filter((option) =>
        option.label.toLowerCase().includes(query.toLowerCase())
    )

    return (
        <div className={`relative ${className}`}>
            <div className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <div className="flex flex-wrap gap-1">
                    {selected.map((value) => {
                        const option = options.find((o) => o.value === value)
                        return (
                            <Badge key={value} variant="secondary" className="hover:bg-secondary/80">
                                {option ? option.label : value}
                                <button
                                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleRemove(value)
                                        }
                                    }}
                                    onMouseDown={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                    }}
                                    onClick={() => handleRemove(value)}
                                >
                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                </button>
                            </Badge>
                        )
                    })}
                    <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground min-w-[120px]"
                        placeholder={selected.length === 0 ? placeholder : ""}
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value)
                            setOpen(true)
                        }}
                        onFocus={() => setOpen(true)}
                        onBlur={() => setTimeout(() => setOpen(false), 200)} // Delay to allow click
                    />
                </div>
            </div>
            {open && filteredOptions.length > 0 && (
                <div className="absolute top-full z-10 mt-1 w-full rounded-md border bg-popover shadow-md outline-none animate-in fade-in-0 zoom-in-95">
                    <div className="max-h-[300px] overflow-auto p-1 text-foreground">
                        {filteredOptions.map((option) => (
                            <div
                                key={option.value}
                                className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer ${selected.includes(option.value) ? "bg-accent/50 opacity-50 cursor-not-allowed" : ""
                                    }`}
                                onMouseDown={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    if (!selected.includes(option.value)) {
                                        handleSelect(option.value)
                                    }
                                }}
                            >
                                {option.label}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
