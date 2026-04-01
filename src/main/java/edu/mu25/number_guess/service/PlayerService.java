package edu.mu25.number_guess.service;

import edu.mu25.number_guess.mapper.Mapper;
import edu.mu25.number_guess.dto.CreatePlayerRequestDto;
import edu.mu25.number_guess.dto.PlayerResponseDto;
import edu.mu25.number_guess.entity.Player;
import edu.mu25.number_guess.repository.PlayerRepository;
import org.springframework.stereotype.Service;

@Service
public class PlayerService {

    private static final String PLAYER_NOT_FOUND = "Player not found";

    private final PlayerRepository playerRepository;

    public PlayerService(PlayerRepository playerRepository) {
        this.playerRepository = playerRepository;
    }

    public PlayerResponseDto createPlayer(CreatePlayerRequestDto request) {
        Player player = Mapper.toPlayer(request);
        playerRepository.save(player);
        return Mapper.toPlayerResponseDto(player);
    }

    public PlayerResponseDto getPlayer(Integer id) {
        Player player = playerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(PLAYER_NOT_FOUND));
        return Mapper.toPlayerResponseDto(player);
    }

    public PlayerResponseDto updatePlayer(Integer id, CreatePlayerRequestDto request) {
        Player player = playerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(PLAYER_NOT_FOUND));
        player.setUsername(request.getUsername());
        playerRepository.save(player);
        return Mapper.toPlayerResponseDto(player);
    }

    public void deletePlayer(Integer id) {
        playerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(PLAYER_NOT_FOUND));
        playerRepository.deleteById(id);
    }
}
