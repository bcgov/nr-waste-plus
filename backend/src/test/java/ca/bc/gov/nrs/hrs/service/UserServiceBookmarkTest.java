package ca.bc.gov.nrs.hrs.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.entity.users.UserBookmarkEntity;
import ca.bc.gov.nrs.hrs.repository.UserBookmarkRepository;
import ca.bc.gov.nrs.hrs.repository.UserPreferenceRepository;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | User Service - Bookmarks")
class UserServiceBookmarkTest {

  @SuppressWarnings("unused") // required by @InjectMocks for UserService constructor
  @Mock
  private UserPreferenceRepository preferenceRepository;

  @Mock
  private UserBookmarkRepository bookmarkRepository;

  @InjectMocks
  private UserService userService;

  private static final String USER_ID = "IDIR\\testuser";

  @Test
  @DisplayName("getUserBookmarksInList with empty list should fetch all user bookmarks")
  void getUserBookmarksInList_emptyList_shouldFetchAll() {
    var bookmark1 = new UserBookmarkEntity(USER_ID, 100L);
    var bookmark2 = new UserBookmarkEntity(USER_ID, 200L);

    when(bookmarkRepository.findByUserId(USER_ID))
        .thenReturn(List.of(bookmark1, bookmark2));

    List<Long> result = userService.getUserBookmarksInList(USER_ID, List.of());

    assertThat(result).containsExactly(100L, 200L);
    verify(bookmarkRepository).findByUserId(USER_ID);
    verifyNoMoreInteractions(bookmarkRepository);
  }

  @Test
  @DisplayName("getUserBookmarksInList with null list should fetch all user bookmarks")
  void getUserBookmarksInList_nullList_shouldFetchAll() {
    var bookmark1 = new UserBookmarkEntity(USER_ID, 100L);

    when(bookmarkRepository.findByUserId(USER_ID))
        .thenReturn(List.of(bookmark1));

    List<Long> result = userService.getUserBookmarksInList(USER_ID, null);

    assertThat(result).containsExactly(100L);
    verify(bookmarkRepository).findByUserId(USER_ID);
    verifyNoMoreInteractions(bookmarkRepository);
  }

  @Test
  @DisplayName("getUserBookmarksInList with specific IDs should filter by those IDs")
  void getUserBookmarksInList_withIds_shouldFilterByIds() {
    List<Long> reportingUnitIds = List.of(100L, 200L, 300L);
    var bookmark1 = new UserBookmarkEntity(USER_ID, 100L);
    var bookmark2 = new UserBookmarkEntity(USER_ID, 300L);

    when(bookmarkRepository.findByUserIdAndReportingUnitIdIn(USER_ID, reportingUnitIds))
        .thenReturn(List.of(bookmark1, bookmark2));

    List<Long> result = userService.getUserBookmarksInList(USER_ID, reportingUnitIds);

    assertThat(result).containsExactly(100L, 300L);
    verify(bookmarkRepository).findByUserIdAndReportingUnitIdIn(USER_ID, reportingUnitIds);
    verifyNoMoreInteractions(bookmarkRepository);
  }

  @Test
  @DisplayName("getUserBookmarksInList should return empty when user has no bookmarks")
  void getUserBookmarksInList_noBookmarks_shouldReturnEmpty() {
    when(bookmarkRepository.findByUserId(USER_ID))
        .thenReturn(List.of());

    List<Long> result = userService.getUserBookmarksInList(USER_ID, List.of());

    assertThat(result).isEmpty();
  }

  @Test
  @DisplayName("getUserBookmarksInList with IDs should return empty when none match")
  void getUserBookmarksInList_withIds_noMatch_shouldReturnEmpty() {
    List<Long> reportingUnitIds = List.of(999L, 888L);

    when(bookmarkRepository.findByUserIdAndReportingUnitIdIn(USER_ID, reportingUnitIds))
        .thenReturn(List.of());

    List<Long> result = userService.getUserBookmarksInList(USER_ID, reportingUnitIds);

    assertThat(result).isEmpty();
  }
}

