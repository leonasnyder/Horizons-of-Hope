"use client";

interface ImageCardProps {
  src: string;
  alt: string;
  className?: string;
}

export default function ImageCard({ src, alt, className }: ImageCardProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={e => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}
