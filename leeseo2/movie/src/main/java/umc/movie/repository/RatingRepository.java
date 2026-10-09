package umc.movie.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import umc.movie.entity.Rating;

import java.util.List;

public interface RatingRepository extends JpaRepository<Rating, Long> {
    List<Rating> findByMember_MemberIdOrderByRatingIdDesc(Long memberId);
}
