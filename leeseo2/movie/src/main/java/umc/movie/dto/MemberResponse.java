package umc.movie.dto;

public record MemberResponse(
        Long memberId,
        String email,
        String nickname
) {}
