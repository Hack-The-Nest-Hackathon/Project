import { useState } from "react";
import { nasaSource, type NasaPhoto } from "../../lib/api/photos";

export default function PhotoPrint({ photo }: { photo: NasaPhoto }) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="nasa-photo-print">
      {failed ? <p className="photo-image-fallback">The preview is unavailable. Open the NASA record to see the image.</p>
        : /* NASA supplies the preview size and owns the image URL. */
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.imageUrl} alt={photo.title} onError={() => setFailed(true)} />}
      <figcaption>
        <strong>{photo.title}</strong>
        {photo.location && <span>NASA catalog location · {photo.location}</span>}
        <span>Credit · {photo.credit}</span>
        <a href={nasaSource(photo)} target="_blank" rel="noreferrer">NASA Image and Video Library · {photo.nasaId}</a>
      </figcaption>
    </figure>
  );
}
