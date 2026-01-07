import React, { useState, memo } from 'react';
import { Trash2, Heart } from 'lucide-react';
import type { Book } from '../../types/core';
import DeleteConfirmModal from './DeleteConfirmModal';
import { useAppContext } from '../../contexts/AppContext';
import SafeImage from '../../components/UI/SafeImage';

interface BookCardProps {
    book: Book;
    onClick: () => void;
    onDelete?: (id: string) => void;
}

const BookCard = memo(({ book, onClick, onDelete }: BookCardProps) => {
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const { favorites, toggleFavorite } = useAppContext();
    const isFavorite = favorites.includes(book.id);
    const accent = book.coverAccent || '#636e72';

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering onClick
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = () => {
        setShowDeleteModal(false);
        onDelete?.(book.id);
    };

    return (
        <>
            <div
                className="bento-card relative bg-card rounded-2xl p-6 border border-[var(--border-color)] shadow-sm overflow-hidden flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-md cursor-pointer group"
                style={{ '--accent': accent } as React.CSSProperties}
                onClick={onClick}
            >
                {/* Action Buttons (Top Right) */}
                <div className="absolute top-3 right-3 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(book.id);
                        }}
                        className={`p-2 rounded-full backdrop-blur-md transition-colors ${isFavorite
                            ? 'bg-red-500/10 text-red-500'
                            : 'bg-black/20 text-white hover:bg-black/40'
                            }`}
                        title={isFavorite ? "取消收藏" : "收藏"}
                    >
                        <Heart size={16} className={isFavorite ? "fill-current" : ""} />
                    </button>

                    {onDelete && (
                        <button
                            onClick={handleDeleteClick}
                            className="p-2 rounded-full bg-black/20 text-white hover:bg-red-500 hover:text-white backdrop-blur-md transition-all"
                            title="删除书籍"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>

                {/* Cover Deco */}
                {book.cover ? (
                    <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-110">
                        <SafeImage
                            src={book.cover}
                            alt=""
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
                    </div>
                ) : (
                    <div
                        className="absolute top-0 right-0 w-1/2 h-full opacity-10 bg-no-repeat bg-cover transition-opacity group-hover:opacity-20"
                        style={{
                            backgroundColor: accent,
                            maskImage: 'linear-gradient(to left, black 0%, transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(to left, black 0%, transparent 100%)'
                        }}
                    />
                )}

                <div className="z-10 relative">
                    <h3 className={`font-serif text-2xl font-bold mb-2 ${book.cover ? 'text-white' : ''}`}>{book.title}</h3>
                    <p className={`text-sm ${book.cover ? 'text-gray-200' : 'text-secondary'}`}>{book.author}</p>
                    {book.progress > 0 && <p className={`text-xs mt-4 ${book.cover ? 'text-gray-300' : 'text-secondary'}`}>进度: {book.progress}%</p>}
                </div>

                <button className="self-end translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all bg-black text-white dark:bg-white dark:text-black px-4 py-2 rounded-full text-sm font-bold">
                    立即阅读
                </button>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <DeleteConfirmModal
                    bookTitle={book.title}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setShowDeleteModal(false)}
                />
            )}
        </>
    );
});

export default BookCard;

