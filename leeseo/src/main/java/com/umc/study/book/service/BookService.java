package com.umc.study.book.service;

import com.umc.study.book.dto.BookRequestDto;
import com.umc.study.book.dto.BookResponseDto;
import com.umc.study.book.entity.Book;
import com.umc.study.book.repository.BookRepository;
import com.umc.study.category.entity.Category;
import com.umc.study.category.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BookService {
    private final BookRepository bookRepository;
    private final CategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public List<BookResponseDto.BookResponse> getBooks() {
        return bookRepository.findAllByOrderByBookIdDesc().stream()
                .map(BookResponseDto.BookResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BookResponseDto.BookResponse> getBooks(String keyword) {
        return bookRepository.findByTitleContainingOrderByBookIdDesc(keyword).stream()
                .map(BookResponseDto.BookResponse::from)
                .toList();
    }

    @Transactional
    public BookResponseDto.BookResponse createBook(BookRequestDto.CreateBookRequest request) {
        Category category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 카테고리입니다."));

        Book book = new Book(category, request.title(), request.description());
        return BookResponseDto.BookResponse.from(bookRepository.save(book));
    }
}
