type Props = { onPick: (f: File | null) => void }

export default function FilePicker({ onPick }: Props) {
  return (
    <input 
      type="file" 
      accept=".pdf,.jpg,.jpeg,.png" 
      onChange={e=>onPick(e.target.files?.[0] || null)} 
    />
  )
}
