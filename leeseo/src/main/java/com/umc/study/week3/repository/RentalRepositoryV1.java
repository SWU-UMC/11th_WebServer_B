package com.umc.study.week3.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Map;

@Repository
@RequiredArgsConstructor
public class RentalRepositoryV1 {

    private final JdbcTemplate jdbcTemplate;

    public void save(Map<String, Object>body){
        String sql = """
        INSERT INTO rental
        (user_id, book_id, rented_at, due_at, returned_at)
        VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), NULL)
        """;

        jdbcTemplate.update(
                sql,
                body.get("userId"),
                body.get("bookId")
        );
    }

    public void returnBook(Long rentalId){
        String sql = "UPDATE rental SET returned_at = NOW() WHERE rental_id = " + rentalId;

        jdbcTemplate.update(sql);
    }
}
