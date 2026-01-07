import React, { useState, useEffect } from 'react';

interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
    src: string | Blob;
}

const SafeImage: React.FC<SafeImageProps> = ({ src, ...props }) => {
    const [imageUrl, setImageUrl] = useState<string>('');

    useEffect(() => {
        if (!src) return;

        let url: string;
        if (src instanceof Blob) {
            url = URL.createObjectURL(src);
        } else {
            url = src as string;
        }

        setImageUrl(url);

        return () => {
            if (src instanceof Blob && url) {
                URL.revokeObjectURL(url);
            }
        };
    }, [src]);

    if (!imageUrl) return null;

    return <img src={imageUrl} {...props} />;
};

export default React.memo(SafeImage);
