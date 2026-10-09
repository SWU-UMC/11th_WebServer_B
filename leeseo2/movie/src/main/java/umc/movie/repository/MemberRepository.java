package umc.movie.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import umc.movie.entity.Member;

public interface MemberRepository extends JpaRepository<Member, Long> {
    boolean existsByNickname(String nickname);
    boolean existsByEmail(String email);
}