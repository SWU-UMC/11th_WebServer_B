package com.umc.study.week3.controller;

import com.umc.study.week3.service.RentalServiceV1;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/rentals/v1")
@RequiredArgsConstructor
public class RentalControllerV1 {

    private final RentalServiceV1 rentalService;

    @PostMapping
    public String createRental(@RequestBody Map<String, Object> body) {
        rentalService.createRental(body);

        return "신규 도서 대여 기록을 생성했습니다.";
    }

    @PatchMapping("/{rentalId}/return")
    private String returnBook(@PathVariable Long rentalId) {
        rentalService.returnBook(rentalId);

        return "대츨 도서를 반납하였습니다.";
    }
}
