package com.umc.study.week3.service;

import com.umc.study.week3.repository.RentalRepositoryV1;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class RentalServiceV1 {

    private final RentalRepositoryV1 rentalRepository;

    public void createRental(Map<String, Object> body) {
        rentalRepository.save(body);
    }

    public void returnBook(Long rentalId) {
        rentalRepository.returnBook(rentalId);
    }
}
