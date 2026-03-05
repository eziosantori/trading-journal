import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

interface Instrument {
  id: string
  name: string
  symbol: string
}

interface Props {
  instruments: Instrument[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
}

export function InstrumentCombobox({
  instruments,
  value,
  onChange,
  placeholder = 'Cerca strumento...',
}: Props) {
  const [open, setOpen] = useState(false)

  const selected = instruments.find((i) => i.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring',
            !selected && 'text-muted-foreground',
          )}
        >
          {selected ? (
            <span>
              <span className="font-mono font-medium">{selected.symbol}</span>
              <span className="text-muted-foreground ml-1.5">— {selected.name}</span>
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown size={14} className="ml-2 flex-shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Digita simbolo o nome..." />
          <CommandList>
            <CommandEmpty>Nessuno strumento trovato.</CommandEmpty>
            <CommandGroup>
              {instruments.map((i) => (
                <CommandItem
                  key={i.id}
                  value={`${i.symbol} ${i.name}`}
                  onSelect={() => {
                    onChange(i.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    size={14}
                    className={cn('mr-2 flex-shrink-0', value === i.id ? 'opacity-100' : 'opacity-0')}
                  />
                  <span className="font-mono font-medium mr-1.5">{i.symbol}</span>
                  <span className="text-muted-foreground text-xs">{i.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
