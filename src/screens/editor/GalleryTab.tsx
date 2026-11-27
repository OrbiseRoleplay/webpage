import { Gallery } from '../../ui/Gallery'
import { Panel } from '../../ui/kit'
import type { TabProps } from './CharacterEditor'

export function GalleryTab({ c, set }: TabProps) {
  return (
    <Panel title={`Galería visual (${c.gallery.length})`}>
      <Gallery images={c.gallery} mainId={c.mainImageId ?? c.gallery[0]?.id}
        onChange={(gallery) => set({ ...c, gallery, mainImageId: gallery.some((g) => g.id === c.mainImageId) ? c.mainImageId : null })}
        onMain={(id) => set({ ...c, mainImageId: id })} />
    </Panel>
  )
}
