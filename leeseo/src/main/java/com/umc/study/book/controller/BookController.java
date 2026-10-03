package com.umc.study.book.controller;

import com.umc.study.book.dto.BookRequestDto;
import com.umc.study.book.dto.BookResponseDto;
import com.umc.study.book.service.BookService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/books")
@RequiredArgsConstructor
public class BookController {

    private final BookService bookService;

    @GetMapping
    public List<BookResponseDto.BookResponse> getBooks(@RequestParam(required = false) String keyword) {
        if (keyword != null) {
            return bookService.getBooks(keyword);
        }
        return bookService.getBooks();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookResponseDto.BookResponse createBook(@Valid @RequestBody BookRequestDto.CreateBookRequest request) {
        return bookService.createBook(request);
    }
}
