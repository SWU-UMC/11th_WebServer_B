package com.umc.study.week3.service;

import com.umc.study.week3.repository.BookRepositoryV1;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class BookServiceV1 {

    private final BookRepositoryV1 bookRepository;

    public List<Map<String, Object>> getAllBooks() {
        return bookRepository.findAll();
    }

    public void createBook(Map<String, Object> body){
        bookRepository.save(body);
    }

    public List<Map<String, Object>> getBooksByCategory(Long categoryId) {
        return bookRepository.findByCategory(categoryId);
    }
}
