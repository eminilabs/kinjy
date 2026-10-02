/**
 * A sticker id is `<pack>.<name>`; its image is a file we host at
 * /stickers/<pack>/<name>.svg. The path is derived from the id and the id is
 * checked against a strict pattern, so nothing a server or a peer sends can
 * make an <img> point anywhere but our own folder.
 */
const ID = /^([a-z0-9-]+)\.([a-z0-9-]+)$/

export function stickerUrl(id: string): string | null {
  const match = ID.exec(id)
  return match ? `/stickers/${match[1]}/${match[2]}.svg` : null
}
